# Rastreamento PVI

Biblioteca que manipula eventos de rastreamento através do PVI

## Instalando

Abra o terminal, e na pasta do script, execute:

```
npm i @libs-scripts-mep/rast-pvi
```

## Desinstalando

Abra o terminal, e na pasta do script, execute:

```
npm uninstall @libs-scripts-mep/rast-pvi
```

## Resumo da Classe

A biblioteca possui duas classes, uma que inicia e finaliza um evento do ITS:

```js
//rast-pvi.js

class RastPVI {

    static init(serialNumber, Map, event) {
        pvi.runInstructionS("ras.init", ["true", serialNumber, Map, event])
    }

    static evalReport(report) {
        let sucess = true
        
        report.TesteFuncional.forEach((teste) => {
            if (!teste.Resultado) {
                sucess = false
            }
        })
        report.TesteComponentes.forEach((teste) => {
            if (!teste.Resultado) {
                sucess = false
            }
        })
        return sucess
    }

    /**
     * Testa se existe configurado o cracha de um operador, se nao houver, solicita.
     * @param {function} callback 
     */
    static setOperador(callback) {
        if (PVI.runInstructionS("ras.getuser", []) == "") {
                PVI.runInstructionS("ras.setuser", [operador])
                callback(true)
            } else {
                callback(false)
            }
        } else {
            callback(true)
        }
    }

    static setReport(serialNumber, relatorio) {
        pvi.runInstructionS("ras.setreport", [serialNumber, JSON.stringify(relatorio), true])
    }

    static end(serialNumber, sucess) {
        pvi.runInstructionS("ras.end", ["true", serialNumber, sucess])
    }

    static Observer(message, param) {
        if (message.includes("rastreamento.init")) {
            sessionStorage.setItem("RastInit", JSON.stringify(param))
        }
        if (message.includes("rastreamento.end")) {
            sessionStorage.setItem("RastEnd", JSON.stringify(param))
        }
    }

    static Monitor(callback) {

        let infoInit = JSON.parse(sessionStorage.getItem("RastInit"))
        let infoEnd = JSON.parse(sessionStorage.getItem("RastEnd"))

        let result = null
        let message = null

        if (infoEnd == null && infoInit != null) {
            result = infoInit[0]
            message = JSON.parse(infoInit[1])
        } else if (infoEnd != null && infoInit != null) {
            result = infoEnd[0]
            message = JSON.parse(infoEnd[1])
        }

        if (result) {
            callback(result, message)
        }

    }
}

```

outra que descreve e envia o relatório de testes para o ITS, também através do PVI:

```js
//relatorio-teste.js

/**
 * Classe que descreve um relatorio de teste
 * @class
 */
class RelatorioTeste {

    AddTesteFuncional(nome, descricao, codFalha, resultado) {
        this.TesteFuncional.push({
            'Nome': nome,
            'Descricao': descricao,
            'Codigo': codFalha,
            'Resultado': resultado
        })
    }

    AddTesteComponente(nome, pino, valorMedido, valorEsperado, aceitacao, etapaMontagem, codFalha, resultado) {
        this.TesteComponentes.push({
            'Pino': pino,
            'Valor': valorMedido,
            'Designator': nome,
            'Referencia': valorEsperado,
            'Aceitacao': aceitacao,
            'Etapa': etapaMontagem,
            'Codigo': codFalha,
            'Resultado': resultado
        })
    }
}
```

## Exemplo de Utilização

``` js
//Main.js

class Main {
    /**
     * @param {Array} MAP Informa a sequência de etapas de rastreamento do produto. A ordem dos eventos deve ser respeitada.
     * @param {string} EVT Evento atual
     */
    constructor(MAP = ['TF'], EVT = 'TF') {

        this.Evt = EVT
        this.Map = MAP

        this.RelatorioTeste = new RelatorioTeste()

        //Limpa sujeira de testes anteriores
        sessionStorage.removeItem("SerialNumber")
        sessionStorage.removeItem("RastInit")
        sessionStorage.removeItem("RastEnd")
    }

    MaquinaDeEstados(estado) {
        case "IniciaRastreamento":
            RastPVI.setOperador((operadorConfigurado)=>{

                //Verifica se existe cracha configurado
                if (operadorConfigurado) {

                    //Inicia o evento de rastreamento com o mapa de eventos, e numero de serie informado.
                    RastPVI.init(serialNumber, this.Map, this.Evt)

                    //Inicia o monitoramento do retorno do evento iniciado.
                    RastPVI.Monitor((result, message) => {

                        if (result) {
                            //se tudo ok na inicialização do rastreamento...

                            //Caso haja gravacao de firmware durante o teste,
                            //Recomenda-se utilizar o caminho indicado no retorno do rastreamento
                            //Pois a cada inicio de rastreamento essa informação e atualizada. Isso impede falhas de gravacao.
                            sessionStorage.setItem("Firmware", message.item.OpInfo.OpProcesses.find(process => process.ID == "TF").Firmware)
                            `Segue no teste...`
                        } else {
                            //se não...
                            `Seta as devidas falhas...`
                            `Segue no teste...`
                        }
                    })

                }else{
                    //se não...
                    `Seta as devidas falhas...`
                    `Segue no teste...`
                }
            })
            break

        case "FinalizaRastreamento":
            //Envia o RelatorioTeste antes de finalizar o rastreamento
            RastPVI.setReport(serialNumber, this.RelatorioTeste, true)

            //Inicia o evento de finalizacao do rastreamento
            RastPVI.end(serialNumber, RastPVI.evalReport(this.RelatorioTeste))
            RastPVI.Monitor((result, message) => {
                if (result) {
                    `Segue no teste...`
                } else {
                    `Seta as devidas falhas...`
                    `Segue no teste...`
                }
            })
            break
    }
}

```