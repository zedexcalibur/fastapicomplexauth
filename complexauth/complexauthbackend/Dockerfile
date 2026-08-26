# Start with a Python image
FROM python:3.12

# Set the working directory inside the container
WORKDIR /app

# Copy the list of Python dependencies
COPY requirements.txt .

# Install the dependencies inside the image
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY . .

# Start the FastAPI application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]