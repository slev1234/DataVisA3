import pandas as pd

# Load the original CSV
df = pd.read_csv("data/usa_00003_23.csv", low_memory=False)

print("Original rows:", len(df))

# Convert DEGFIELD to numeric (handles strings, '000', etc)
df["DEGFIELD"] = pd.to_numeric(df["DEGFIELD"], errors="coerce")

# 1. Remove rows where no bachelor's degree (DEGFIELD = 0 or NaN)
df = df[df["DEGFIELD"].notna()]
df = df[df["DEGFIELD"] != 0]

print("After removing non-degree rows:", len(df))

# Save cleaned output
df.to_csv("data/usa_00003.csv", index=False)
print("Saved cleaned dataset to data/usa_00003.csv")
