# Stripe Setup — Run these commands then add your keys

# 1. Install Stripe on the backend
cd I:\Agent-service\backend
npm install stripe

# 2. Install Stripe on the frontend
cd I:\Agent-service\frontend
npm install @stripe/stripe-js @stripe/react-stripe-js

# 3. Add your keys after running the above:
#    backend/.env  → STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
#    frontend/.env → VITE_STRIPE_PUBLISHABLE_KEY

# 4. For local webhook testing, install Stripe CLI then run:
#    stripe listen --forward-to localhost:5000/api/payments/webhook
#    (it prints the whsec_... secret — paste that into backend/.env)
