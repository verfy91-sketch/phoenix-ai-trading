"""
Setup script for Phoenix Engine Python Bindings
"""

from setuptools import setup, find_packages

# Read README
try:
    with open("README.md", "r", encoding="utf-8") as fh:
        long_description = fh.read()
except FileNotFoundError:
    long_description = "Python bindings for Phoenix AI Trading Engine"

# Read requirements
with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="phoenix-engine",
    version="1.0.0",
    author="Phoenix AI Trading System",
    author_email="support@phoenix-trading.ai",
    description="Python bindings for Phoenix AI Trading Engine",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/your-username/phoenix-engine",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Office/Business :: Financial :: Investment",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.7.0",
            "flake8>=6.0.0",
            "mypy>=1.5.0",
        ],
    },
    include_package_data=True,
    package_data={
        "phoenix_ipc": ["*.py"],
        "strategies": ["*.py"],
        "benchmarks": ["*.py"],
    },
    entry_points={
        "console_scripts": [
            "phoenix-trainer=main:app",
            "phoenix-train=train:main",
            "phoenix-fetch=historical_data_fetcher:main",
        ],
    },
)
