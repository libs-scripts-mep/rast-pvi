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
    
    static setSerialCode(callback) {

        let serialCode = prompt("Informe o número de serie do produto.")

        if (serialCode != null) {
            if (serialCode.match(/[1][0][0][0][0-9]{8}/) != null) {
                callback(true, serialCode)
            } else {
                callback(false)
            }
        } else {
            callback(false)
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

    /**
     * Adiciona um teste funcional ao array de testes funcionais
     * Exemplo:
     * 
     * AddTesteFuncional("COM", "Impossível comunicar", -1, true)
     * @memberof RelatorioTeste
     * @param {string} nome Nome do teste (utilizado na pesquisa. ex : E1, S1 ...)
     * @param {string} descricao Descrição do teste (string longa)
     * @param {number} codFalha Codigo de falha (-1 se nao tem)
     * @param {boolean} resultado True ou False
     */
    AddTesteFuncional(nome, descricao, codFalha, resultado) {
        this.TesteFuncional.push({
            'Nome': nome,
            'Descricao': descricao,
            'Codigo': codFalha,
            'Resultado': resultado
        })
    }

    /**
     * Adiciona um teste de componente ao array de testes de componentes
     * Exemplo:
     * 
     * AddTesteComponente("VccVoltage", -1, 311.2,  311.0, 5, "G", -1, true)
     * @memberof RelatorioTeste
     * @param {string} nome Designator do componente (R1, T1 ...)
     * @param {number} pino Numero do pino (-1 se não tem)
     * @param {number} valorMedido Valor medido (com decimais)
     * @param {number} valorEsperado Valor de referência (com decimais)
     * @param {number} aceitacao Porcentagem de aceitação (+/-)
     * @param {string} etapaMontagem Etapa do componente
     * @param {number} codFalha Codigo de falha (-1 se nao tem)
     * @param {boolean} resultado True ou False
     */
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

    /**
     * Ordena alfabeticamente os testes funcionais e de componentes existentes em uma instancia de um RelatorioTeste
     * @param {RelatorioTeste} relatorio 
     */
    static OrdenaRelatorio(relatorio) {

        relatorio.TesteFuncional.sort()
        relatorio.TesteComponentes.sort()
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