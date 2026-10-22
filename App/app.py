from fastapi import FastAPI 

app = FastAPI()

@app.get("/hello-sheiko")
def hello_sheiko():
    return {"message": "Hello Sheiko - What you thinking"}