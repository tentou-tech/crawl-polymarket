# Polymarket Data Analysis

This folder contains notebooks and scripts for analyzing Polymarket data, specifically for calculating user PnL and exploring trading patterns.

## Environment Setup

We use **Conda** to manage the Python environment.

### 1. Prerequisites
Ensure you have [Anaconda](https://www.anaconda.com/) or [Miniconda](https://docs.conda.io/en/latest/miniconda.html) installed.

### 2. Create and Activate Environment

Run the following commands in your terminal to create a virtual environment named `poly-analysis` and install the required packages.

```bash
# Create the environment with Python 3.10
conda create -n poly-analysis python=3.10 -y

# Activate the environment
conda activate poly-analysis

# Install dependencies from requirements.txt
pip install -r requirements.txt
```

### 3. Running Jupyter

Once the environment is activated, start the Jupyter server:

```bash
jupyter notebook
```

This will open a browser window where you can create new `.ipynb` files.

## Project Structure

- `data/`: (Optional) Place your CSV exports here (e.g., `trades.csv`, `markets.csv`).
- `notebooks/`: Your Jupyter notebooks.

## PnL Calculation Logic

Refer to the formula discussed:
$$ 	ext{Total PnL} = 	ext{Net Cash Flow} + 	ext{Current Value} $$

1.  **Net Cash Flow:** $\sum (\text{Sell Price} \times \text{Shares}) - \sum (\text{Buy Price} \times \text{Shares})$
2.  **Current Value:** $\text{Shares Held} \times \text{Current Price (or 1.0/0.0 if resolved)}$
