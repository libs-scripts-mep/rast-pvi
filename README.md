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
 globalReport.AddTesteFuncional("PS", "PS incorreto", errors.PRODUTO.MONTAGEM_MTA, false) 
```