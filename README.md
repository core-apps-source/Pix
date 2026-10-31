# Pix — Controle de gastos

App web (PWA) para registrar gastos em Pix, crédito ou débito. Os dados ficam salvos **neste aparelho** (navegador). Dá para exportar e importar um backup em JSON.

O app da tela inicial usa `index.html` + JavaScript. O Flask em `app.py` é opcional: serve o mesmo site e ainda expõe uma API SQLite, mas o painel **não depende** dela.

## Abrir no computador (sem servidor)

Dê dois cliques em `gastos_app/index.html`, ou cole no Chrome:

`file:///C:/Users/PICHAU/Downloads/gastos_app/gastos_app/index.html`

Os gastos continuam salvos neste navegador. Instalar como app no celular precisa do site no GitHub Pages (HTTPS).

## Rodar com servidor local (opcional)

```
python -m http.server 8080
```

Depois acesse: http://localhost:8080/gastos_app/

### Servidor Flask (opcional)

```
pip install -r requirements.txt
python app.py
```

Abre em http://127.0.0.1:5000  
Para testar no celular na mesma Wi-Fi:

```
set HOST=0.0.0.0
python app.py
```

Aí use `http://SEU-IP:5000` no Chrome do celular. Instalar na tela inicial só funciona de verdade depois de publicar em HTTPS (GitHub Pages).

## Subir para o GitHub e publicar

1. Crie um repositório vazio no GitHub (por exemplo `gastos_app`).
2. Na pasta do projeto:

```
git init
git add .
git commit -m "App de gastos pronto para instalar no celular"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/gastos_app.git
git push -u origin main
```

3. No GitHub: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `main` / pasta `/ (root)`
4. Espere 1–2 minutos. O endereço fica:

`https://SEU-USUARIO.github.io/gastos_app/`

## Instalar no celular (Android)

1. Abra o site do GitHub Pages **no Chrome**.
2. Toque no botão **Instalar app** (se aparecer) ou no menu ⋮ → **Instalar app** / **Adicionar à tela inicial**.
3. O Pix abre em tela cheia, como um app.

No iPhone: Safari → botão de compartilhar → **Adicionar à Tela de Início**.

Os gastos **não sincronizam** entre celular e computador. Use **Exportar backup** / **Importar backup** para copiar os dados.

## Estrutura

```
gastos_app/                     # pasta do projeto
├── gastos_app/
│   ├── index.html              # Abra este arquivo no Chrome
│   ├── manifest.webmanifest
│   ├── sw.js
│   └── static/
├── app.py
└── requirements.txt
```

## API Flask (opcional)

- `GET /api/gastos` — lista todos os gastos
- `POST /api/gastos` — cria um gasto `{descricao, valor, metodo, categoria, data}`
- `PUT /api/gastos/<id>` — edita um gasto
- `DELETE /api/gastos/<id>` — remove um gasto
- `GET /api/resumo` — totais por método de pagamento
