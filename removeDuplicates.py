import pandas as pd

# Read the CSV file into a Pandas DataFrame
file_name = "data.csv"
df = pd.read_csv(file_name, sep=",")

# Remove duplicate rows (based on all columns)
df.drop_duplicates(subset=["username"], inplace=True)

# Write the results to a new CSV file
file_name_output = "data_no_duplicates.csv"
df.to_csv(file_name_output, index=False)
