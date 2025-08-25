import seaborn as sns
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

def correlationPlot(combined):
    # Select columns for correlation analysis including pressure
    columns_to_analyze = ["heartRateValue", "movementValue", "hrvValue", "respirationValue", "sleepStage", "temperatureValue", "humidityValue", "precipitationValue", "pressureValue"]

    # Filter out columns with zero variance
    valid_columns = []
    for col in columns_to_analyze:
        if col in combined.columns and combined[col].var() > 0:
         valid_columns.append(col)
        else:
            print(f"Skipping {col} - missing or no variance")

    # Calculate correlation matrix including pressure
    correlation_matrix = combined[valid_columns].corr()

    # Plot correlation heatmap
    plt.figure(figsize=(12, 10))
    sns.heatmap(correlation_matrix, annot=True, cmap="coolwarm", center=0, square=True, fmt=".3f")
    plt.title("Correlation Matrix - Sleep & Weather Variables (including Pressure)")
    plt.tight_layout()
    plt.show()

def timePlot(combined,yesterday):
    fig, axes = plt.subplots(5, 2, figsize=(16, 14), sharex=True)
    axes = axes.flatten()

    # Plot each variable in its own subplot
    variables = [
    ("heartRateValue", "Heart Rate (bpm)", "red"),
    ("movementValue", "Movement", "orange"), 
    ("hrvValue", "HRV", "green"),
    ("respirationValue", "Respiration", "blue"),
    ("sleepStage", "Sleep Stage", "purple"),
    ("temperatureValue", "Temperature (°C)", "darkred"),
    ("humidityValue", "Humidity (%)", "lightblue"),
    ("precipitationValue", "Precipitation (mm)", "gray"),
    ("pressureValue", "Pressure (hPa)", "brown")
    ]

    for i, (col, ylabel, color) in enumerate(variables):
        if col == "sleepStage":
            axes[i].step(combined.index, combined[col], color=color, linewidth=2, where='post')
        else:
            axes[i].plot(combined.index, combined[col], color=color, linewidth=2, alpha=0.8)
    
    axes[i].set_ylabel(ylabel, fontsize=10)
    axes[i].grid(True, alpha=0.3)
    axes[i].set_xlim(combined.index.min(), combined.index.max())

    # Combined plot with separate axes but no labels (10th subplot)
    ax_main = axes[9]

    # Create multiple y-axes for the combined plot
    twin_axes = [ax_main]
    for i in range(8):  # Need 8 additional axes for 9 total variables
        twin_ax = ax_main.twinx()
        twin_ax.spines['right'].set_position(('outward', 0))  # All on same position since labels are hidden
        twin_axes.append(twin_ax)

    # Plot each variable on its own axis without labels
    for i, (col, ylabel, color) in enumerate(variables):
        ax = twin_axes[i]
        if col == "sleepStage":
            ax.step(combined.index, combined[col], color=color, linewidth=2, where='post', alpha=0.8)
        else:
            ax.plot(combined.index, combined[col], color=color, linewidth=2, alpha=0.8)
    
        # Hide y-axis labels and ticks
        ax.set_yticklabels([])
        ax.tick_params(axis='y', which='both', left=False, right=False)

    ax_main.grid(True, alpha=0.3)
    ax_main.set_xlim(combined.index.min(), combined.index.max())

    # Format x-axis for bottom row
    for ax in axes[8:]:
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
        ax.xaxis.set_major_locator(mdates.HourLocator(interval=2))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45)

    axes[8].set_xlabel("Time", fontsize=12)
    axes[9].set_xlabel("Time", fontsize=12)

    plt.suptitle(f"Sleep Data Analysis - {yesterday}", fontsize=16, fontweight="bold")
    plt.tight_layout()
    plt.show()