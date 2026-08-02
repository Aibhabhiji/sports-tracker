import pandas as pd

# 1. Load registration file
try:
    df = pd.read_csv('registration.csv', encoding='utf-8')
except Exception:
    df = pd.read_csv('registration.csv', encoding='latin1')

df.columns = df.columns.str.strip()

sports_data = []

# 2. Loop through each registration row
for idx, row in df.iterrows():
    p_id = row.get('Id', idx + 1)
    name = str(row.get("Participant's Name", '')).strip()
    flat = str(row.get('Flat Number', '')).strip()
    phone = str(row.get('Phone Number', '')).strip()
    age = row.get('Age - Mandatory', '')
    category = str(row.get('Category', '')).strip()
    
    # Clean Phase
    phase_str = str(row.get('Select The Phase', ''))
    phase = 'Phase 2' if 'Phase-2' in phase_str or 'Phase 2' in phase_str else 'Phase 1'

    # Split "Sports Selected" by ';'
    raw_sports = str(row.get('Sports Selected', ''))
    sports_list = [s.strip() for s in raw_sports.split(';') if s.strip()]

    # Include Badminton / Table Tennis if form responses exist
    if pd.notna(row.get('Badminton Type')) and 'Badminton' not in sports_list:
        sports_list.append('Badminton')
    if pd.notna(row.get('Table Tennis Type')) and 'Table Tennis' not in sports_list:
        sports_list.append('Table Tennis')

    # Create an entry for each sport
    for sport in sports_list:
        sports_data.append({
            'Registration_ID': p_id,
            'Name': name,
            'Sport': sport,
            'Phase': phase,
            'Category': category,
            'Age': age,
            'Flat': flat,
            'Phone': phone
        })

# 3. Export to sports_wise_players.csv
sports_df = pd.DataFrame(sports_data)
sports_df.to_csv('sports_wise_players.csv', index=False)

print(f"Success! Processed {len(sports_df)} sports entries across {sports_df['Sport'].nunique()} sports.")
print("Generated file: sports_wise_players.csv")