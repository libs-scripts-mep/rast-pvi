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

> Obsoleto


## Crontrole de finalização do rastreamento

Apartir da versão 3.1.0, é possível controlar a finalização do rastremento na inicialização do número de série, adicionando '```**```' no inicio/final inserido no prompt. 

![Image](https://i.imgur.com/ix7xAfM.png)

## setOperador e setSerialNumber com prompt e alert configuráveis

A partir da versão 3.3.0, é possível utilizar métodos que fazem a função de `prompt` e `alert` sem travar a execução do navegador. Para isto, é necessário passar um objeto como parâmetro, conforme o exemplo:

``` js
const FunctionObj = {
    prompt: {
        Method: UI.prompt,
        Instance: UI,
        Parameters: ["Informe o número de série do produto:"]
    },
    alert: {
        Method: UI.alert,
        Instance: UI,
        Parameters: ["Número Inválido!"]
    }
}

await TS.Rast.setSerialNumber(FunctionObj)
```
- Desta forma, é possível passar métodos que estejam em qualquer biblioteca e que tenham n parâmetros;
- Parâmetros destes métodos devem ser passados dentro de um array na propriedade `Parameters`, pois é utilizado um [apply()](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Function/apply);
- Estes métodos devem retornar uma `Promise` (para permitir o uso do `await`);
- O método prompt deve retornar um objeto contendo as propriedades `result` (true ou false) e `value` (valor digitado).

## Exemplo de Utilização

``` js
class TestScript {
    constructor(eventMap, event) {

        this.RelatorioTeste = new RelatorioTeste()
        this.EventMap = eventMap
        this.Event = event

        this.Run().then(async () => {

            RelatorioTeste.OrdenaRelatorio(this.TestReport)
            this.Rast.setReport(this.RelatorioTeste)
            const rastEndSucess = await this.Rast.end(RastUtil.evalReport(this.RelatorioTeste))
            if (!rastEndSucess) { throw this.Rast.EndInfo.Message }

            UI.displayReport(this.RelatorioTeste)

        }).catch((error) => {
            this.RelatorioTeste.AddTesteFuncional("Exception", error, -1, false)
            UI.displayReport(this.RelatorioTeste)
        })
    }

    async Run() {

        UI.setMsg("Iniciando rastreamento...")

        if(RastUtil.isFirstExec()){
            //instruções iniciais
        }
        
        RastUtil.setValidations(RastUtil.ENABLED, RastUtil.ENABLED, RastUtil.ENABLED, RastUtil.DISABLED)
        this.Rast = new RastPVI(this.EventMap, this.Event)

        await RastUtil.setOperador()
        await this.Rast.setSerialNumber()

        const rastInitSucess = await this.Rast.init()
        if (!rastInitSucess) { this.TestReport.AddTesteFuncional("Rastreamento Init", this.Rast.InitInfo.Message, -1, false); return }
        UI.setTitle(this.Rast.InitInfo.item.OpInfo.Product.Name)
        const finalFirmwarePath = this.Rast.InitInfo.item.OpInfo.OpProcesses.find(process => process.ID == "TF").Firmware
    }
}
```