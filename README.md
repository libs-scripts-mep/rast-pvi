# Rastreamento PVI

Biblioteca que manipula eventos de rastreamento através do PVI

## Instalando

Abra o terminal, e na pasta do script, execute:

```
npm i @libs-scripts-mep/rast-pvi
```

Após fianlizada a instalação da biblioteca, inclua em seu html:

```html
	<script src="node_modules/@libs-scripts-mep/rast-pvi/rast-pvi.js"></script>
	<script src="node_modules/@libs-scripts-mep/rast-pvi/relatorio-teste.js"></script>
```

## Desinstalando

Abra o terminal, e na pasta do script, execute:

```
npm uninstall @libs-scripts-mep/rast-pvi
```

## Exemplo de Utilização

``` js
class TestScript {
    constructor() {

        RastUtil.setValidations(RastUtil.ENABLE, RastUtil.ENABLE, RastUtil.ENABLE, RastUtil.DISABLED)

        this.Rast = new RastPVI(['TF'], 'TF')
        this.RelatorioTeste = new RelatorioTeste()

        this.Run().then(async () => {

            this.Rast.setReport(this.RelatorioTeste)
            const rastEndSucess = await this.Rast.end(RastUtil.evalReport(this.RelatorioTeste))
            if (!rastEndSucess) { throw this.Rast.EndInfo.Message }

            UI.finalizaTeste(this.RelatorioTeste)

        }).catch((error) => {
                this.RelatorioTeste.AddTesteFuncional("Exception", error, -1, false)
                UI.finalizaTeste(this.RelatorioTeste)
        })
    }

    async Run() {

        UI.setMsg("Iniciando rastreamento...")
        await this.Rast.setSerialNumber()
        const rastInitSucess = await this.Rast.init()
        if (!rastInitSucess) { throw this.Rast.InitInfo.Message }
    }
}
```