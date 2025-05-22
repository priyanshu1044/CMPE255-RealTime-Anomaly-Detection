"""
Contributors:
Kruti Bathani: Developed the transaction simulator to generate realistic synthetic financial data. Implemented the Kafka-based streaming pipeline, developed the core and enhanced anomaly detector services.
"""

from kafka import KafkaProducer
import json, random, time
import uuid
import datetime

MERCHANT_CATEGORIES = ["Retail", "Restaurant", "Travel", "Entertainment", "Grocery", "Electronics", "Healthcare", "Utilities", "Education", "Other"]
PAYMENT_METHODS = ["Credit Card", "Debit Card", "Bank Transfer", "Digital Wallet", "Cryptocurrency"]
DEVICE_TYPES = ["Mobile", "Desktop", "Tablet", "ATM", "POS Terminal"]
TRANSACTION_TYPES = ["purchase", "withdrawal", "refund", "transfer", "payment", "deposit"]

user_profiles = {}
for user_id in range(1, 101):
    user_profiles[user_id] = {
        "usual_locations": random.sample(["US", "IN", "UK", "CA", "AU", "JP", "DE", "FR", "BR", "SG"], k=random.randint(1, 3)),
        "usual_merchants": random.sample(MERCHANT_CATEGORIES, k=random.randint(2, 5)),
        "typical_min_amount": round(random.uniform(5, 200), 2),
        "typical_max_amount": round(random.uniform(300, 2000), 2),
        "typical_payment_methods": random.sample(PAYMENT_METHODS, k=random.randint(1, 3)),
        "typical_transaction_times": [random.randint(8, 22) for _ in range(random.randint(3, 8))]  
    }

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8'))

transaction_count = 0

while True:
    is_anomalous = (transaction_count % 20 == 0)
    transaction_count += 1
    
    user_id = random.randint(1, 100)
    user = user_profiles[user_id]
    
    current_time = time.time()
    current_hour = datetime.datetime.fromtimestamp(current_time).hour
    
    if is_anomalous:
        location = random.choice(["RU", "NG", "CN", "MX", "ZA"])
        amount = round(random.uniform(3000, 10000), 2)
        merchant_category = random.choice([cat for cat in MERCHANT_CATEGORIES if cat not in user["usual_merchants"]])
        if current_hour in user["typical_transaction_times"]:
            current_hour = (current_hour + 12) % 24
    else:      
        location = random.choice(user["usual_locations"])
        amount = round(random.uniform(user["typical_min_amount"], user["typical_max_amount"]), 2)
        merchant_category = random.choice(user["usual_merchants"])
    
    txn = {
        "transaction_id": str(uuid.uuid4()),
        "user_id": user_id,
        "amount": amount,
        "currency": "USD",
        "location": location,
        "timestamp": current_time,
        "transaction_type": random.choice(TRANSACTION_TYPES),
        "merchant": {
            "merchant_id": f"MERCH{random.randint(1000, 9999)}",
            "name": f"{merchant_category}_{random.randint(100, 999)}",
            "category": merchant_category
        },
        "payment_method": random.choice(user["typical_payment_methods"] if not is_anomalous else PAYMENT_METHODS),
        "device_info": {
            "type": random.choice(DEVICE_TYPES),
            "ip_address": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}"
        }
    }
    
    txn["_anomalous"] = is_anomalous
    producer.send("transactions", txn)
    print(f"Sent {'ANOMALOUS' if is_anomalous else 'Normal'} Transaction:")
    print(json.dumps(txn, indent=2))
    print("-" * 80)  
    
    time.sleep(random.uniform(0.5, 2.0))
