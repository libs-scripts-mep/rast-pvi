class RastPVI {

    constructor(eventMap, event) {
        this.SerialNumber = null

        this.InitInfo = null
        this.EndInfo = null

        this.EventMap = eventMap
        this.Event = event
    }

    async startObserver() {
        return new Promise((resolve) => {

            const id = PVI.FWLink.globalDaqMessagesObservers.add((message, param) => {

                if (message.includes(this.SerialNumber)) {
                    const result = param[0]
                    const info = JSON.parse(param[1])

                    if (message.includes("init")) {
                        this.InitInfo = info
                        PVI.FWLink.globalDaqMessagesObservers.remove(id)
                        console.log(`Rastreamento Init ${this.SerialNumber}\n`, result, info)
                        resolve(result)
                    }
                    if (message.includes("end")) {
                        this.EndInfo = info
                        PVI.FWLink.globalDaqMessagesObservers.remove(id)
                        console.log(`Rastreamento End ${this.SerialNumber}\n`, result, info)
                        resolve(result)
                    }
                }
            }, "rastreamento")
        })
    }

    async setSerialNumber(serialNumber = null) {
        if (serialNumber != null && RastUtil.evalSerialNumber(serialNumber)) {
            this.SerialNumber = serialNumber
            return
        } else {
            return new Promise(async (resolve) => {
                let number = prompt("Informe o número de serie do produto.")

                if (RastUtil.evalSerialNumber(number)) {
                    this.SerialNumber = number
                    resolve()
                } else {
                    resolve(this.setSerialNumber())
                }
            })
        }
    }

    async init(program = "", startTime = "") {
        pvi.runInstructionS("ras.init", ["true", this.SerialNumber, this.EventMap.join(";"), this.Event, program, startTime])
        return await this.startObserver()
    }

    setReport(relatorio) {
        pvi.runInstructionS("ras.setreport", [this.SerialNumber, JSON.stringify(relatorio), true])
    }

    async end(sucess, informationMap = new Map(), endTime = "") {
        let informationText = ""
        let cont = 0

        informationMap.forEach((valor, chave) => {
            informationText += `${valor}=${chave}`
            if (cont < informationMap.size) {
                informationText += "|"
            }
            cont++
        })

        pvi.runInstructionS("ras.end", ["true", this.SerialNumber, sucess, informationText, endTime])
        return await this.startObserver()
    }
}

class RastUtil {

    static ENABLE = "enabled"
    static DISABLED = "disabled"

    static setValidations(
        user = RastUtil.ENABLE,
        station = RastUtil.ENABLE,
        map = RastUtil.ENABLE,
        script = RastUtil.ENABLE) {
        PVI.runInstructionS("rastreamento.setvalidations", [user, station, map, script])
    }

    static setOperador() {
        if (PVI.runInstructionS("ras.getuser", []) == "") {

            let operador = prompt("Informe o Número do Cracha")

            if (!isNaN(operador) && operador != null) {
                PVI.runInstructionS("ras.setuser", [operador])
                return true
            } else {
                return false
            }

        } else {
            return true
        }
    }

    /**
     * Itera sobre um objeto do tipo RelatorioTeste verificando se ha falhas.
     * @param {RelatorioTeste} report
     * @returns [true] se nao houver falha, [false] se houver.
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

    static evalSerialNumber(serialNumber) {
        if (serialNumber != null && serialNumber.match(/[1][0][0][0][0-9]{8}/) != null) {
            return true
        } else {
            return false
        }
    }
}