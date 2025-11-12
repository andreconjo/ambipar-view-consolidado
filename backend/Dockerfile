# Imagem base Python
FROM python:3.11-slim

# Diretório de trabalho
WORKDIR /app

# Copiar requirements e instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Expor porta
EXPOSE 5000

# Variáveis de ambiente
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Comando para rodar a aplicação
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"]
