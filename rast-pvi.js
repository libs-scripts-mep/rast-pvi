import FWLink from "../daq-fwlink/FWLink.js"

/**
 * 
 * @param {Array} eventMap 
 * @param {String} event 
 * @param {Object} componentsToEval
 * 
 * # Exemplos
 * 
 * ```js
 * let testComponents = {
            Base: {
                name: "BS-80",
                image: "images/BS-80.png",
                message: "Informe o código de barras da base:",
                regex: "(BS|bs)-80.[1-9](\/|;)(REV|rev)[0-9]",
            },
            Fixture: {
                name: "FX-64",
                image: "images/FX-64.jpeg",
                message: "Informe o código de barras do fixture:",
                regex: "(FX|fx)-64.[1-9](\/|;)(REV|rev)[0-9]",
            }
        }
 * 
 * let rast = new RastPVI(["PT", "TF"], "TF", testComponents)
 * ```
 */
export class RastPVI {
    constructor(eventMap, event, componentsToEval) {
        this.SerialNumber = null

        this.InitInfo = null
        this.EndInfo = null

        this.SendTracking = true

        this.EventMap = eventMap
        this.Event = event

        sessionStorage.getItem("ExecCount") == null ? sessionStorage.setItem("ExecCount", 0) : null

        if (sessionStorage.getItem("TestComponents") == null) {
            const responseObj = this.setTestComponents(componentsToEval)

            if (responseObj.sucess) { sessionStorage.setItem("TestComponents", JSON.stringify(responseObj.response)) }
            else { throw new Error(responseObj.message) }
        }

        this.TestComponents = JSON.parse(sessionStorage.getItem("TestComponents"))
    }

    /**
     * 
     * @param {object} componentsToEval
     * @returns 
     */
    setTestComponents(componentsToEval) {

        const nameIndex = 0, objIndex = 1
        const responseObj = {}

        for (const component of Object.entries(componentsToEval)) {

            const getResult = evalComponent(component[objIndex].regex, component[objIndex].message)

            if (getResult.sucess) {
                responseObj[component[nameIndex]] = getResult.component
            } else {
                return { sucess: false, response: responseObj, message: `${component[nameIndex]} incompatível com o solicitado` }
            }
        }

        return { sucess: true, response: responseObj, message: `` }

        function evalComponent(regex, message) {
            const input = prompt(message)

            if (input != null) {
                const component = input.match(regex)

                if (component != null) {
                    return { sucess: true, component: component[0].toUpperCase() }
                } else {
                    return { sucess: false, component: null }
                }

            } else {
                return { sucess: false, component: input }
            }
        }
    }

    /**
     * Aguarda emissão de evento de rastreamento do PVI
     * @returns 
     */
    async startObserver() {
        return new Promise((resolve) => {

            const id = FWLink.PVIEventObserver.add((message, param) => {

                if (message.includes(this.SerialNumber)) {
                    const result = param[0]
                    const info = JSON.parse(param[1])

                    if (message.includes("init")) {
                        this.InitInfo = info
                        FWLink.PVIEventObserver.remove(id)
                        console.log(`Rastreamento Init ${this.SerialNumber}\n`, result, info)
                        resolve(result)
                    }
                    if (message.includes("end")) {
                        this.EndInfo = info
                        FWLink.PVIEventObserver.remove(id)
                        console.log(`Rastreamento End ${this.SerialNumber}\n`, result, info)
                        result ? sessionStorage.setItem("ExecCount", parseInt(sessionStorage.getItem("ExecCount")) + 1) : null
                        resolve(result)
                    }
                }
            }, "rastreamento")
        })
    }

    async setSerialNumber(serialNumber = null) {
        if (serialNumber != null && typeof serialNumber == "object") {
            const Prompt = serialNumber.prompt
            const Alert = serialNumber.alert

            const number = await Prompt.Method.apply(Prompt.Instance, Prompt.Parameters)
            if (number.result) {
                if (RastUtil.evalSerialNumber(number.value)) {
                    this.setSerialNumber(number.value)
                } else {
                    await Alert.Method.apply(Alert.Instance, Alert.Parameters)
                    return this.setSerialNumber(serialNumber)
                }
            } else {
                await Alert.Method.apply(Alert.Instance, Alert.Parameters)
                return this.setSerialNumber(serialNumber)
            }

        } else {
            if (serialNumber != null && RastUtil.evalSerialNumber(serialNumber)) {
                if (serialNumber.includes("**")) {
                    serialNumber = serialNumber.replace("**", "")
                    this.SendTracking = false
                }
                this.SerialNumber = serialNumber
                return
            } else {
                return new Promise(async (resolve) => {
                    const number = prompt("Informe o número de serie do produto.")

                    if (RastUtil.evalSerialNumber(number)) {
                        resolve(this.setSerialNumber(number))
                    } else {
                        alert("O valor informado não é um número de série!")
                        resolve(this.setSerialNumber())
                    }
                })
            }
        }
    }

    /**
     * 
     * @param {Boolean} fluxControl Impede que uma peça seja retestada se já tiver erro apontado. Para retestar é necessário um apontamento de conserto, ou se a mesma já possuir apontamento de sucesso, não será retestada sem um apontamento de revisão. Funciona a partir do PVI `4.7.0.0`
     * @param {String} program 
     * @param {String} startTime 
     * @returns Boolean
     * 
     * # Exemplos
     * 
     * ```js
     * import { RastPVI, RastUtil } from "../node_modules/@libs-scripts-mep/rast-pvi/rast-pvi.js"
     * const rastInitSucess = await rast.init(true)
     * ```
     * 
     * ## Algoritmo recomendado
     * ```js
     * import { RastPVI, RastUtil } from "../node_modules/@libs-scripts-mep/rast-pvi/rast-pvi.js"
     * import RelatorioTeste from "../node_modules/@libs-scripts-mep/rast-pvi/relatorio-teste.js"
     * 
     * RastUtil.setValidations(RastUtil.ENABLED, RastUtil.ENABLED, RastUtil.ENABLED, RastUtil.DISABLED)
     * await RastUtil.setOperador()
     * await rast.setSerialNumber()
     * const rastInitSucess = await rast.init(true)
     * if (!rastInitSucess) { tempReport.AddTesteFuncional("Rastreamento Init", rast.InitInfo.Message, -1, false) }
     * ```
     * 
     * ## 💡 Controle de finalização de rastreamento
     * É possível controlar a finalização do rastremento na inicialização do número de série, adicionando `**` ao inicio/final do número, Ex:
     * 
     * ```
     * 1000001234567** ou **1000001234567
     * ```
     */
    async init(program = "", startTime = "") {
        FWLink.runInstructionS("ras.init", ["true", this.SerialNumber, this.EventMap.join(";"), this.Event, program, startTime])
        return await this.startObserver()
    }

    /**
     * Relaciona um relatorio de teste com um número de série
     * @param {RelatorioTeste} relatorio 
     * @returns 
     * 
     * # Exemplos
     * 
     * ```js
     * let myReport = new RelatorioTeste()
     * let rast = new RastPVI()
     * rast.setReport(myReport)
     * ```
     */
    setReport(relatorio) {
        return FWLink.runInstructionS("ras.setreport", [this.SerialNumber, JSON.stringify(relatorio), true]) == 1
    }

    /**
     * 
     * @param {Boolean} sucess 
     * @param {String} endTime 
     * @returns Boolean
     * 
     * # Exemplos
     * 
     * ```js
     * let rast = new RastPVI()
     * rast.end(true)
     * ```
     * 
     * ## Algoritmo recomendado
     * ```js
     * let myReport = new RelatorioTeste()
     * let rast = new RastPVI()
     * rast.setReport(myReport)
     * rast.end(RastUtil.evalReport(myReport))
     * ```
     */
    async end(sucess, endTime = "") {
        let informationText = ""
        let splitterCount = 0

        const components = new Map(Object.entries(this.TestComponents))

        components.forEach((value, key) => {
            informationText += `${key}=${value}`
            if (splitterCount < components.size) { informationText += "|" }
            splitterCount++
        })

        if (this.SendTracking) {
            FWLink.runInstructionS("ras.end", ["true", this.SerialNumber, sucess, informationText, endTime])
            return await this.startObserver()
        } else {
            alert("O Rastreamento não será finalizado!!")
            return true
        }
    }
}

export class RastUtil {

    static ENABLED = "enabled"
    static DISABLED = "disabled"

    static isFirstExec() {
        return sessionStorage.getItem("ExecCount") == null || sessionStorage.getItem("ExecCount") == 0
    }

    static getExecCount() {
        return sessionStorage.getItem("ExecCount") == null ? 0 : parseInt(sessionStorage.getItem("ExecCount"))
    }

    /**
     * Possibilita habilitar ou desabilitar de forma conveniente as validações do ITS 
     * @param {String} user permite que o rastreamento seja iniciado e finalizado sem informar o operador
     * @param {String} station permite que o rastreamento seja iniciado e finalizado sem informar a estação
     * @param {String} map permite que o rastreamento seja iniciado e finalizado sem informar o mapa de eventos e onevento atual
     * @param {String} script permite que o rastreamento seja iniciado e finalizado sem rodar o script de caminho apontado no ERP
     * 
     * # Exemplos
     * 
     * ```js
     * RastUtil.setValidations(RastUtil.ENABLED, RastUtil.ENABLED, RastUtil.ENABLED, RastUtil.DISABLED)
     * ```
     */
    static setValidations(user, station, map, script) {
        FWLink.runInstructionS("rastreamento.setvalidations", [user, station, map, script])
    }

    static async setOperador(Operador = null) {
        return new Promise(async resolve => {
            if (FWLink.runInstructionS("ras.getuser", []) == "") {

                if (Operador != null && typeof Operador == "object") {
                    const Prompt = Operador.prompt
                    const Alert = Operador.alert

                    const operador = await Prompt.Method.apply(Prompt.Instance, Prompt.Parameters)
                    if (operador.result) {
                        if (this.evalOperador(operador.value)) {
                            resolve(this.setOperador(operador.value))
                        } else {
                            await Alert.Method.apply(Alert.Instance, Alert.Parameters)
                            resolve(this.setOperador(Operador))
                        }
                    } else {
                        await Alert.Method.apply(Alert.Instance, Alert.Parameters)
                        resolve(this.setOperador(Operador))
                    }

                } else {
                    if (this.evalOperador(Operador)) {
                        FWLink.runInstructionS("ras.setuser", [Operador])
                        resolve()

                    } else {
                        const operador = prompt("Informe o Número do Cracha")

                        if (this.evalOperador(operador)) {
                            resolve(this.setOperador(operador))
                        } else {
                            alert("O valor informado não é um número!")
                            resolve(this.setOperador())
                        }
                    }
                }

            } else {
                resolve()
            }
        })
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

    static evalOperador(operador) {
        if (!isNaN(operador) && operador != null && operador != "") {
            return true
        } else {
            return false
        }
    }

    /**
     * Transfere o conteúdo de um ou mais relatorios de teste origem para um relatorio destino
     * @param {Array} reportsFrom 
     * @param {RelatorioTeste} toReport 
     * 
     * # Exemplos
     * 
     * ```js
     * const mainReport = new RelatorioTeste()
     * const myReport1 = new RelatorioTeste()
     * const myReport2 = new RelatorioTeste()
     * RastUtil.transferReport([myReport1, myReport2], mainReport)
     * ```
     */
    static transferReport(reportsFrom = [], toReport) {
        for (const report of reportsFrom) {

            for (const test of report.TesteComponentes) {
                toReport.TesteComponentes.push(test)
            }
            for (const test of report.TesteFuncional) {
                toReport.TesteFuncional.push(test)
            }
        }
    }

    /**
     * Retorna o caminho da pasta do script que está sendo executado, baseado no HTML.
     * @returns string
     */
    static getScriptPath() {
        let pathC = location.pathname.slice(location.pathname.indexOf("C:/"), location.pathname.lastIndexOf("/"))
        let pathI = location.pathname.slice(location.pathname.indexOf("I:/"), location.pathname.lastIndexOf("/"))

        if (pathC.length > 0) {
            return pathC
        } else if (pathI.length > 0) {
            return pathI
        }
    }

    /**
     * Retorna o caminho da pasta do PVI em execucao
     * @returns string
     */
    static getPVIPath() {
        return FWLink.runInstructionS("getpvipath", [])
    }

    static { window.RastUtil = RastUtil }
}