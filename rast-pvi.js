import RelatorioTeste from "../rast-pvi/relatorio-teste.js"
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

            if (responseObj.success) { sessionStorage.setItem("TestComponents", JSON.stringify(responseObj.response)) }
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

            if (getResult.success) {
                responseObj[component[nameIndex]] = getResult.component
            } else {
                return { success: false, response: responseObj, message: `${component[nameIndex]} incompatível com o solicitado` }
            }
        }

        return { success: true, response: responseObj, message: `` }

        function evalComponent(regex, message) {
            const input = prompt(message)

            if (input != null) {
                const component = input.match(regex)

                if (component != null) {
                    return { success: true, component: component[0].toUpperCase() }
                } else {
                    return { success: false, component: null }
                }

            } else {
                return { success: false, component: input }
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

    async setSerialNumber(UIObject = null, allowCancel = false) {
        return new Promise(async (resolve) => {

            if (UIObject != null && typeof UIObject == "object") {
                const Prompt = UIObject.prompt
                const Alert = UIObject.alert

                const number = await Prompt.Method.apply(Prompt.Instance, Prompt.Parameters)
                if (number.result) {
                    if (number.value.includes("**")) {
                        number.value = number.value.replace("**", "")
                        this.SendTracking = false
                    }
                    this.SerialNumber = number.value
                    return resolve(true)
                } else {
                    if (allowCancel) { return resolve(false) }
                    await Alert.Method.apply(Alert.Instance, Alert.Parameters)
                    return resolve(this.setSerialNumber(UIObject))
                }

            } else {
                const number = prompt("Informe o número de serie do produto.")
                if (number.includes("**")) {
                    number = number.replace("**", "")
                    this.SendTracking = false
                }
                this.SerialNumber = number
                return resolve(true)
            }
        })
    }

    /**
     * 
     * @param {String} program 
     * @param {String} startTime 
     * @returns Boolean
     * 
     * # Exemplos
     * 
     * ```js
     * import { RastPVI, RastUtil } from "../node_modules/@libs-scripts-mep/rast-pvi/rast-pvi.js"
     * const rastInitsuccess = await rast.init(true)
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
     * const rastInitsuccess = await rast.init(true)
     * if (!rastInitsuccess) { tempReport.AddTesteFuncional("Rastreamento Init", rast.InitInfo.Message, -1, false) }
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
     * @param {Boolean} success 
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
    async end(success, endTime = "") {
        let informationText = ""
        let splitterCount = 0

        const components = new Map(Object.entries(this.TestComponents))

        components.forEach((value, key) => {
            informationText += `${key}=${value}`
            if (splitterCount < components.size) { informationText += "|" }
            splitterCount++
        })

        if (this.SendTracking) {
            FWLink.runInstructionS("ras.end", ["true", this.SerialNumber, success, informationText, endTime])
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

    static async setOperador(UIObject = null) {
        return new Promise(async resolve => {
            if (FWLink.runInstructionS("ras.getuser", []) == "") {

                if (UIObject != null && typeof UIObject == "object") {
                    const Prompt = UIObject.prompt
                    const Alert = UIObject.alert

                    const operador = await Prompt.Method.apply(Prompt.Instance, Prompt.Parameters)
                    if (operador.result) {

                        if (FWLink.runInstructionS("ras.setuser", [operador.value]) != "1") {
                            await Alert.Method.apply(Alert.Instance, Alert.Parameters)
                        }
                        resolve(this.setOperador(UIObject))

                    } else {
                        await Alert.Method.apply(Alert.Instance, Alert.Parameters)
                        resolve(this.setOperador(UIObject))
                    }

                } else {
                    const operador = prompt("Informe o Número do Cracha")
                    if (FWLink.runInstructionS("ras.setuser", [operador]) != "1") {
                        alert("Número de usuário inválido")
                    }
                    resolve(this.setOperador())
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
        let success = null

        if (report.TesteFuncional.length != 0 || report.TesteComponentes.length != 0) {

            success = true

            report.TesteFuncional.forEach((teste) => {
                if (!teste.Resultado) {
                    success = false
                }
            })
            report.TesteComponentes.forEach((teste) => {
                if (!teste.Resultado) {
                    success = false
                }
            })
        }
        return success
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

        if (toReport == undefined || !toReport instanceof RelatorioTeste) {
            throw new Error(`Falha ao transferir relatórios: '${toReport}' não é uma instância de 'RelatorioTeste'`)
        }

        for (const report of reportsFrom) {
            if (report != undefined && report instanceof RelatorioTeste) {
                for (const test of report.TesteComponentes) {
                    toReport.TesteComponentes.push(test)
                }
                for (const test of report.TesteFuncional) {
                    toReport.TesteFuncional.push(test)
                }
            } else {
                throw new Error(`Falha ao transferir relatórios: '${report}' não é uma instância de 'RelatorioTeste'`)
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