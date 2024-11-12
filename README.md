# Rastreamento PVI

Biblioteca que manipula eventos de rastreamento através do PVI

## Instalando

Abra o terminal, e na pasta raíz do script, execute:

```
npm i @libs-scripts-mep/rast-pvi
```

## Desinstalando

Abra o terminal, e na pasta raíz do script, execute:

```
npm uninstall @libs-scripts-mep/rast-pvi
```

## Atualizando

Abra o terminal, e na pasta raíz do script, execute:

```
npm update @libs-scripts-mep/rast-pvi
```
## Como utilizar

Realize a importação:

``` js
import { RastPVI, RastUtil } from "../node_modules/@libs-scripts-mep/rast-pvi/rast-pvi.js"
import RelatorioTeste from "../node_modules/@libs-scripts-mep/rast-pvi/relatorio-teste.js"
```

As demais informações e instruções estarão disponíveis via `JSDocs`.

# errorsGenerator

Execute o arquivo `errorsGenerator.js` com NodeJS, irá criar um arquivo `error.js` no root do repositório.
 ```js
 export const errors: {
    PRODUTO: {
        DISPLAY: number;
        TECLA: number;
        BUZZER: number;
        TEMPERATURA: number;
        ...;
    JIGA: {
        ...;
    };
    OPERADOR: {
        ...;
    };
}
 ```

Utilize este aquivo para configurar o código de erro no relatório de teste. Veja o exemplo abaixo:
``` js
import { errors } from "../errors.js"

 globalReport.AddTesteFuncional("PS", "PS incorreto", errors.PRODUTO.MONTAGEM_MTA, false) 
```

# Convenção de uso

```JSON
{
    "PRODUTO": {
        "GRAVAÇÃO": 2002,               // Quando controlador não responder durante a gravação
        "DISPLAY": 2000,                // Quando for possível detectar falha no display
        "TECLA": 2001,                  // Quando for possível detectar falha na tecla
        "COMUNICAÇÃO": 2003,            // Quando for possível detectar falha na comunicação durante o teste (A primeira falha de comunicação - portDiscover() - deve ser apontada para a JIGA)
        "BUZZER": 2004,                 // Quando for possível detectar falha no buzzer
        "TEMPERATURA": 2005,            // Quando for possível detectar falha na temperatura (NTC, PTC, Temperatura ambiente)
        "CALIBRAÇÃO": 2006,             // Quando for possível detectar falha na verificação da calibração
        "ENTRADAS": 2007,               // Quando for possível detectar falha nas entradas digitais ou analógicas
        "SAÍDAS": 2008,                 // Quando for possível detectar falha nas saídas (digitais, TRIAC, IGBT, MOSFET...)
        "LED": 2009,                    // Quando for possível detectar falha no LED
        "CONECTOR": 2010,               // Quando for possível detectar ausencia de conectores
        "MONTAGEM_SMT": 2012,           // Quando for possível detectar falha na montagem no SMT
        "MONTAGEM_MTA": 2011,           // Quando for possível detectar falha na montagem no MTA
        "COMPONENTE_DEFEITUOSO": 2013   // Quando for possível detectar componente defeituoso
    },
    "JIGA": {
        "COMUNICAÇÃO": 3000,            // Quando detectar falha na comunicação SOMENTE NA PRIMEIRA TENTATIVA ( portDiscover() )
        "DAQ": 3001,                    // Quando o DAQ não estiver respondendo
        "GRAVAÇÃO": 3002,               // Quando a gravação falha por causa do gravador (TOOL is not responding)
        "CÂMERA": 3003,                 // Quando falhar a inicialização da câmera ou microfone   
        "CAPPO_ECIL": 3004,             // Quando for possível detectar falha no cappo ECIL (normalmente comunicação)
        "CAPPO_INOVA": 3005,            // Quando for possível detectar falha no cappo INOVA (normalmente comunicação)
        "DISPOSITIVO_AUXILIAR": 3006    // Quando for possível detectar falha no dispositivo auxiliar (Fontes, trafos, módulos específicos)
    },
    "OPERADOR": {
        "TIMEOUT": 4000                 // Quando o operador não responde durante o teste
    }
}
```