import requests

BASE = 'http://127.0.0.1:8000'
SUPABASE_URL = ''
SERVICE_ROLE_KEY =''
SB = {'apikey': SERVICE_ROLE_KEY, 'Authorization': 'Bearer ' + SERVICE_ROLE_KEY}

# Step 1 - login
r = requests.post(BASE + '/api/v1/auth/login', json={'email': 'user@crednexa.com', 'password': 'user123'})
assert r.status_code == 200, 'Login failed: ' + r.text
token = r.json()['token']
user_id = r.json()['user']['id']
print('LOGIN OK - user_id:', user_id)

# Step 2 - check profile in Supabase
r2 = requests.get(SUPABASE_URL + '/profiles?id=eq.' + user_id + '&select=id,email,role', headers=SB)
profiles = r2.json()
print('SUPABASE PROFILE:', profiles)

# Step 3 - submit application
r3 = requests.post(BASE + '/api/v1/predict', json={
    'applicant_name': 'E2E Automated Test',
    'ApplicantIncome': 9000.0,
    'CoapplicantIncome': 1500.0,
    'LoanAmount': 250.0,
    'Loan_Amount_Term': 360.0,
    'Credit_History': '1',
    'Property_Area': 'Urban',
    'Married': 'No',
    'Education': 'Graduate',
    'Self_Employed': 'No',
    'Dependents': '0'
}, headers={'Authorization': 'Bearer ' + token})
assert r3.status_code == 200, 'Predict failed: ' + r3.text
pred = r3.json()
print('PREDICT OK - decision:', pred['decision'], '| prob:', pred['probability'])

# Step 4 - verify in Supabase
r4 = requests.get(SUPABASE_URL + '/applications?select=id,applicant_name,predicted_decision,predicted_prob,user_id&order=created_at.desc&limit=5', headers=SB)
apps = r4.json()
print('SUPABASE APPS COUNT:', len(apps))
for a in apps:
    row = 'id=' + str(a['id']) + ' name=' + str(a['applicant_name']) + ' dec=' + str(a['predicted_decision']) + ' uid=' + str(a['user_id'])
    print(' ', row)

# Step 5 - check audit logs
r5 = requests.get(SUPABASE_URL + '/audit_logs?select=action,actor_role,created_at&order=created_at.desc&limit=5', headers=SB)
logs = r5.json()
print('AUDIT LOGS:', len(logs), 'entries')
for e in logs[:3]:
    print(' ', e.get('created_at','')[:19], e.get('action'), '| role=' + str(e.get('actor_role')))

# Final verdict
latest_name = apps[0]['applicant_name'] if apps else ''
if latest_name == 'E2E Automated Test':
    print('\nSUCCESS - Data is saving to Supabase correctly!')
else:
    print('\nWARNING - Latest app name mismatch: ' + latest_name)
