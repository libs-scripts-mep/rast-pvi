FileSystem = require("fs")
class Errors {
    constructor(outDir = __dirname.split("node_modules")[0]) {
        this.outDir = outDir
        this.errorsList = null
        this.code = {
            PRODUTO: {},
            JIGA: {},
            OPERADOR: {},
        }

        this.getProductionErrorsList().then((data) => {
            this.errorsList = data
            this.populateCode()
            this.writeFile()
        })
    }
    async getProductionErrorsList() {
        const response = await fetch("http://rast.inova.ind.br/api/tracker/code?department=PRODU%C3%87%C3%83O&limit=1500")
        const json = await response.json()
        return json
    }

    populateCode() {
        if (this.errorsList == null) { throw new Error("Failed to get errors list") }
        else {
            for (const error of this.errorsList) {
                if (error.Group == "PRODUTO") {
                    this.code.PRODUTO[error.SubGroup] = error.Code
                } else if (error.Group == "JIGA") {
                    this.code.JIGA[error.SubGroup] = error.Code
                } else if (error.Group == "OPERADOR") {
                    this.code.OPERADOR[error.SubGroup] = error.Code
                }
            }
            console.log(this.code)
        }
    }

    writeFile() {
        const templateES6Modules = `export const errors = ${JSON.stringify(this.code, null, 4)}`
        FileSystem.writeFileSync(this.outDir + "/errors.js", templateES6Modules)
    }
}

const errors = new Errors()
