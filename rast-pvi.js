class RastPVI {

    /**
     * Inicia um evento de rastreamento atraves do PVI.
     * @param {number} serialNumber 
     * @param {array} Map array de eventos que precisam constar no rastreamento em ordem, Ex: ["PT", "TF"]
     * @param {string} event indica o evento atual, Ex: "PT" ou "TF".
     * @param {string} program Atualmente nao utilizado
     * @param {string} startTime atualmente nao utilizado
     */
    static init(serialNumber, Map, event, program = "", startTime = "") {

        //Remove possível sujeira
        sessionStorage.removeItem("RastInit")
        sessionStorage.removeItem("RastEnd")

        PVI.FWLink.globalDaqMessagesObservers.addString('RastPVI.Observer', "PVI.DaqScript.DS_Rastreamento.rastreamento")
        pvi.runInstructionS("ras.init", ["true", serialNumber, Map.join(";"), event, program, startTime])
    }

    /**
     * Itera sobre um objeto do tipo RelatorioTeste verificando se ha falhas.
     * @param {RelatorioTeste} report
     * @returns [true] se nenhum registro do relatorio conter falha, [false] se houver.
     */
    static evalReport(report) {

        let sucess = null

        if (report.TesteFuncional.length != 0 || report.TesteComponentes.length != 0) {

            sucess = true

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
        }
        return sucess
    }

    /**
     * Testa se existe configurado o cracha de um operador, se nao houver, solicita.
     * @param {function} callback 
     */
    static setOperador(callback) {

        if (PVI.runInstructionS("ras.getuser", []) == "") {

            let operador = prompt("Informe o Número do Cracha")

            if (!isNaN(operador) && operador != null) {
                PVI.runInstructionS("ras.setuser", [operador])
                callback(true)
            } else {
                callback(false)
            }

        } else {
            callback(true)
        }
    }

    /**
     * Envia um objeto do tipo RelatorioTeste para o ITS - Inova Tracking System
     * @param {number} serialNumber
     * @param {RelatorioTeste} relatorio
     */
    static setReport(serialNumber, relatorio) {
        pvi.runInstructionS("ras.setreport", [serialNumber, JSON.stringify(relatorio), true])
    }

    /**
     * Finaliza um evento de rastreamento previamente iniciado.
     * @param {number} serialNumber
     * @param {bool} sucess
     */
    static end(serialNumber, sucess) {

        //Remove possível sujeira
        sessionStorage.removeItem("RastInit")
        sessionStorage.removeItem("RastEnd")

        let endTime = ""
        let informationText = ""

        pvi.runInstructionS("ras.end", ["true", serialNumber, sucess, informationText, endTime])
    }

    /**
     * Disponibiliza as informacoes recebidas do rastreamento em um item do sessionStorage.
     * Metodo invocado em: 
     * 
     * Rastreamento.init(){PVI.FWLink.globalDaqMessagesObservers.addString()}
     * 
     * @param {string} message 
     * @param {object} param 
     */
    static Observer(message, param) {

        if (message.includes("rastreamento.init")) {

            let ns = message.match(/[1][0]{4}[0-9]{8}/)

            if (sessionStorage.getItem("SerialNumber") == ns) {

                sessionStorage.setItem("RastInit", JSON.stringify(param))

            }
        }

        if (message.includes("rastreamento.end")) {

            let ns = message.match(/[1][0]{4}[0-9]{8}/)

            if (sessionStorage.getItem("SerialNumber") == ns) {

                sessionStorage.setItem("RastEnd", JSON.stringify(param))

            }
        }
    }

    /**
     * Aguarda as informacoes do rastreamento serem disponibilizadas no sessionStorage 
     * @param {function} callback função que trata o retorno do rastreamento
     * @param {number} timeOut tempo que o script aguarda o evento ocorrer
     */
    static Monitor(callback, timeOut = 5000) {
        let monitorRast = setInterval(() => {
            try {

                let infoInit = JSON.parse(sessionStorage.getItem("RastInit"))
                let infoEnd = JSON.parse(sessionStorage.getItem("RastEnd"))

                let result = null
                let message = null

                if (infoInit != null) {
                    result = infoInit[0]
                    message = JSON.parse(infoInit[1])
                }

                if (infoEnd != null) {
                    result = infoEnd[0]
                    message = JSON.parse(infoEnd[1])
                }

                console.log(result, message)

                if (result != null) {
                    clearInterval(monitorRast)
                    clearTimeout(timeoutRast)
                    callback(result, message)
                } else {
                    console.warn("Evento ainda não ocorreu")
                }

            } catch (error) {
                console.warn(error)
            }
        }, 500)

        let timeoutRast = setTimeout(() => {
            clearInterval(monitorRast)
            callback(false, "Rastreamento demorou para responder")
        }, timeOut)
    }
}