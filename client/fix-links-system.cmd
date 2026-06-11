@echo off
cd /d "C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages"
for %%f in (*.tsx) do (
  powershell -Command "(Get-Content '%%f' -Raw) -replace 'Link o=\{\x60', 'Link to=`\x60' | Set-Content '%%f'"
)
echo Done
