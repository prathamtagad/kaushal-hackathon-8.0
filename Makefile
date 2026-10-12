# Bachat Makefile
# Usage: make demo  →  seeds data + trains model + starts backend + frontend
# Requires: Python 3.11+, Node 18+ in PATH

PYTHON  = .venv\Scripts\python.exe
PIP     = .venv\Scripts\pip.exe
UVICORN = .venv\Scripts\uvicorn.exe

.PHONY: all demo install install-backend install-frontend seed train backend frontend test clean help

all: demo

## ─────────────────────── ONE-COMMAND DEMO ───────────────────────
demo: install seed train
	@echo "Starting Bachat..."
	@start "Backend" cmd /c "$(UVICORN) backend.main:app --host 0.0.0.0 --port 8000 --reload 2>&1"
	@start "Frontend" cmd /c "cd frontend && npm.cmd run dev 2>&1"
	@echo "======================================================="
	@echo " Backend:  http://localhost:8000"
	@echo " Frontend: http://localhost:5173"
	@echo " API docs: http://localhost:8000/docs"
	@echo "======================================================="

## ─────────────────────── INSTALL ───────────────────────
install: install-backend install-frontend

install-backend:
	@if not exist ".venv\Scripts\python.exe" python -m venv .venv
	$(PIP) install fastapi uvicorn "websockets>=12.0" "pydantic>=2.0" numpy pandas lightgbm scikit-learn cvxpy httpx pytest pyarrow

install-frontend:
	cd frontend && npm.cmd install

## ─────────────────────── DATA & MODEL ───────────────────────
seed:
	$(PYTHON) -m backend.ml.datagen

train:
	$(PYTHON) -c "from backend.ml.forecast import forecaster; forecaster.train(); print('Model trained, MAPE:', forecaster.mape)"

## ─────────────────────── RUN SEPARATELY ───────────────────────
backend:
	$(UVICORN) backend.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm.cmd run dev

## ─────────────────────── TEST ───────────────────────
test:
	$(PYTHON) -m pytest tests/ -v

## ─────────────────────── CLEAN ───────────────────────
clean:
	if exist ".venv" rmdir /s /q .venv
	if exist "models\lgbm_forecast.pkl" del "models\lgbm_forecast.pkl"
	if exist "models\forecast_meta.json" del "models\forecast_meta.json"
	if exist "data\history.parquet" del "data\history.parquet"
	cd frontend && if exist node_modules rmdir /s /q node_modules

help:
	@echo Bachat Makefile Targets
	@echo   make demo            - Full demo: install + seed + train + start servers
	@echo   make install         - Install backend (venv) and frontend (npm) deps
	@echo   make seed            - Generate synthetic history parquet
	@echo   make train           - Train LightGBM load-forecast model
	@echo   make backend         - Start backend only  (port 8000)
	@echo   make frontend        - Start frontend only (port 5173)
	@echo   make test            - Run pytest test suite
	@echo   make clean           - Remove venv, models, data files
