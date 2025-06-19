################GUIA COMPLETA INSTALAR LSP######################
# Nota: omite algunos pasos si ya lo tienes 
# PASO 1: clonar repo
git clone https://github.com/Frank-Chile/Front_LSP.git
# Paso 2: cambiar a la rama de feture-model-integration
git checkout feature-model-integration
# Paso3: obtener los cambios recientes
git fetch
# Paso 4: Aplicar cambios revibidos al proyecto
git pull

# Paso 4: crear env
python -m venv back3nd/app/.env

# Paso 5: activar env
### OPCION 1: Activar desde CMD
back3nd\app\.venv\Scripts\activate

### OPCION 2: Activar desde PowerShell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass .env\Scripts\Activate.ps1

### OPCION 3: Activar desde GitBash
source .env/scripts/activate

# Paso 6: instalar dependencias
pip install -r requisitos.txt

# Paso 7: Abre una terminal para correr el backend
cd back3nd/app