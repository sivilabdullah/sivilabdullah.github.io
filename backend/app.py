from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
import os
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'  # Production'da değiştir
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///trademaster.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# CORS ayarları
CORS(app, origins=['*'])

# Database
db = SQLAlchemy(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    subscription_plan = db.Column(db.String(50), default='free')
    subscription_end = db.Column(db.DateTime)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def generate_token(self):
        payload = {
            'user_id': self.id,
            'exp': datetime.utcnow() + timedelta(days=7)
        }
        return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

# User API Keys Model
class UserAPIKeys(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    binance_api_key = db.Column(db.String(256))
    binance_secret = db.Column(db.String(256))  # Encrypted olacak
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# JWT token kontrolü
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.filter_by(id=data['user_id']).first()
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# Auth Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validation
    if not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password are required'}), 400
    
    # Check if user exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered'}), 400
    
    # Create new user
    user = User(email=data['email'])
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    # Generate token
    token = user.generate_token()
    
    return jsonify({
        'message': 'User created successfully',
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'subscription_plan': user.subscription_plan
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if user and user.check_password(data['password']):
        token = user.generate_token()
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'subscription_plan': user.subscription_plan
            }
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({
        'user': {
            'id': current_user.id,
            'email': current_user.email,
            'subscription_plan': current_user.subscription_plan,
            'created_at': current_user.created_at,
            'subscription_end': current_user.subscription_end
        }
    })

@app.route('/api/user/api-keys', methods=['POST'])
@token_required
def save_api_keys(current_user):
    data = request.get_json()
    
    if not data.get('api_key') or not data.get('secret_key'):
        return jsonify({'message': 'API key and secret are required'}), 400
    
    # TODO: Validate Binance keys here
    
    # Check if user already has keys
    existing_keys = UserAPIKeys.query.filter_by(user_id=current_user.id).first()
    
    if existing_keys:
        existing_keys.binance_api_key = data['api_key']
        existing_keys.binance_secret = data['secret_key']  # TODO: Encrypt this
    else:
        new_keys = UserAPIKeys(
            user_id=current_user.id,
            binance_api_key=data['api_key'],
            binance_secret=data['secret_key']  # TODO: Encrypt this
        )
        db.session.add(new_keys)
    
    db.session.commit()
    
    return jsonify({'message': 'API keys saved successfully'}), 200

@app.route('/api/user/api-keys', methods=['GET'])
@token_required
def get_api_keys(current_user):
    keys = UserAPIKeys.query.filter_by(user_id=current_user.id).first()
    
    if keys:
        return jsonify({
            'has_keys': True,
            'api_key': keys.binance_api_key[:8] + '...',  # Sadece ilk 8 karakter
            'created_at': keys.created_at
        })
    
    return jsonify({'has_keys': False})

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'message': 'TradeMaster API is running'})

# Database oluşturma
@app.before_first_request
def create_tables():
    db.create_all()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000) 