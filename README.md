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

## Controle de fluxo

O controle de fluxo serve para impedir que uma peça seja retestada se já tiver erro apontado no rast, para retestar é necessário um apontamento de conserto, ou se a mesma já possuir apontamento de sucesso, não será retestada sem um apontamento de revisão.
A partir da versão 4.7.0.0 do PVI, ele é capaz de controlar o fluxo do processo. Para habilitar é necessário mandar uma variável do tipo `boolean` como parametro, veja o exemplo abaixo:

``` javascript
// variavel que habilita o controle de fluxo a partir do PVI, 'true' para habilitado
const fluxControl = true
const rastInitSucess = await this.Rast.init(fluxControl)
```

> o método atribui por default o valor `false` à essa variável, então não se preocupe caso não for utilizar

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