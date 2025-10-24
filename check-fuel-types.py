import pandas as pd

# Read equipment list
df = pd.read_excel('Request for Proposal No. ANR-6-2025 Genertor Services/4-Equipment List 10-1-2025.xlsx')
df_gen = df[df['Output KW'].notna()].copy()

print(f'Total generators: {len(df_gen)}\n')
print('Engine Analysis (looking for fuel type indicators):\n')

# Common diesel engine model indicators
diesel_indicators = ['D', 'TD', 'QS', 'NT', 'LT', 'CT', 'TAD', 'KDI', 'C6', 'C15', '4000', 'V']
gas_indicators = ['G', 'GAS', 'NG']

for i, row in df_gen.iterrows():
    engine = str(row['Engine Model Number']).upper()
    manufacturer = str(row['Engine Manufacture'])

    # Infer fuel type from model name
    likely_diesel = any(ind in engine for ind in diesel_indicators)
    likely_gas = 'G' in engine and engine.endswith('G') or 'GAS' in engine

    fuel_guess = 'Diesel' if likely_diesel else ('Natural Gas' if likely_gas else 'Unknown')

    print(f'{i+1:2}. {row["Building/Asset"]:20} | {manufacturer:15} {engine:20} | kW: {str(row["Output KW"]):10} | Likely: {fuel_guess}')

# Check for any natural gas indicators in NOTES column
print('\n\nNOTES column check:')
if 'NOTES' in df_gen.columns:
    notes_with_data = df_gen[df_gen['NOTES'].notna()]
    if len(notes_with_data) > 0:
        print(notes_with_data[['Building/Asset', 'NOTES']].to_string())
    else:
        print('No notes found in equipment list')
