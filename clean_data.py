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

# # (Optional but recommended)
# # 2. Keep only employed at work (EMPSTAT = 1)
# if "EMPSTAT" in df.columns:
#     df = df[df["EMPSTAT"] == 1]
#     print("After filtering employed-at-work:", len(df))

# # 3. Must have valid workplace state (PWSTATE2 != 0 and not missing)
# if "PWSTATE2" in df.columns:
#     df["PWSTATE2"] = pd.to_numeric(df["PWSTATE2"], errors="coerce")
#     df = df[df["PWSTATE2"].notna() & (df["PWSTATE2"] != 0)]
#     print("After keeping valid PWSTATE2:", len(df))

# # Optional cleanup: keep only needed columns for the visualization
# keep_cols = [
#     "DEGFIELD",
#     "DEGFIELDD",
#     "EMPSTAT",
#     "PWSTATE2",
#     "PERWT"
# ]

# df = df[keep_cols]

# Save cleaned output
df.to_csv("data/usa_00003.csv", index=False)
print("Saved cleaned dataset to data/usa_00003.csv")
