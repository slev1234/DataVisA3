import pandas as pd

# --- CONFIGURATION ---
input_file = "data/usa_00003_23.csv"   # your CSV file
output_file = "data/usa_00003_23trimmed.csv" # file to save the first 36000 rows
max_rows = 36000            # number of rows to keep

# --- READ CSV ---
df = pd.read_csv(input_file)

# --- KEEP ONLY FIRST 36000 ROWS ---
df_trimmed = df.head(max_rows)

# --- SAVE TO NEW CSV ---
df_trimmed.to_csv(output_file, index=False)

print(f"Trimmed file saved as '{output_file}' with {len(df_trimmed)} rows.")
