# Testprocess och riskbaserad testmatris

## Om du använder wordpress

Skippa denna guide. Det är ingen idé att testa wordpress eftersom det är slöseri med tid.

## Syfte

Ett enkelt och rakt sätt att avgöra när vi måste testa och vilka testtyper som behövs, baserat på risk och komplexitet. Tester ska hjälpa oss och inte bara bli ett extra onödigt steg. Vi testar bara om det verkligen behövs och inte bara för att.

## Omfattning

Gäller alla funktioner, jobb eller tjänster där fel påverkar användare, datakvalitet eller verksamheten. Detta är projektoberoende och bör kunna appliceras på alla projekt som inte kör wordpress eller liknande ramverk som vi anser är opassande för komplexa lösningar.

## Steg 1: Poängsätt risk (0-3)

Poängsätt hur allvarligt det är om funktionen går fel i produktion.

- 0: Ingen affärspåverkan, lätt att se och fixa, användare märker inget
- 1: Smått jobbigt internt, enkel manuell fix, användare märker inget
- 2: Användare får fel data eller delvis avbrott, påverkar affärskritiska flöden
- 3: Systemet blir i praktiken oanvändbart eller kritisk data saknas

Kodexempel (risk):

Risk 0 (intern helper, ingen påverkan):

```js
function formatName(first, last) {
    return `${first} ${last}`.trim();
}
```

Risk 1 (intern rapport, kan köras om):

```js
function buildDailyReport(rows) {
    return rows.map((r) => ({ id: r.id, total: r.qty * r.price }));
}
```

Risk 2 (fel data för användare):

```js
function applyDiscount(price, percent) {
    // Fel här ger fel pris i UI
    return Math.round(price * (1 - percent / 100));
}
```

Risk 3 (kritisk data saknas, system blir oanvändbart):

```js
function importOrders(csv, db) {
    // Om detta fallerar saknas orderdata i frontend
    db.bulkInsert(parseCsv(csv));
}
```

## Steg 2: Poängsätt komplexitet (0-3)

Poängsätt hur sannolikt det är att funktionen går sönder p.g.a. kod- eller datakomplexitet.

- 0: Enkel logik, få grenar, inga externa beroenden
- 1: Normal logik, lite branching, begränsade beroenden
- 2: Flera format/regler, krångligare parsing, flera beroenden
- 3: Komplex parsing/transformering, många beroenden, felhantering eller edge cases är vanliga

### Begrepp

- Branching = koden kan ta flera olika vägar beroende på om något är sant eller falskt (Se exempel **komplexitet 1**).
- Grenar =

Kodexempel (komplexitet):

Komplexitet 0 (enkel logik):

```js
function isEven(n) {
    return n % 2 === 0;
}
```

Komplexitet 1 (lite branching):

```js
function priceWithTax(price, isFood) {
    let tax = 0;
    if (isFood) {
        tax = 0.12
    } else if (! isFood) {
        tax = 0.25
    }
    return Math.round(price * (1 + tax));
}
```

Komplexitet 2 (flera regler + parsing):

```js
function normalizeRow(row) {
    if ((row.id && typeof row.id == 'string') &&
        (typeof row.price == 'string') &&
        (typeof row.date == 'string')
    ) {
        return {
            id: row.id.trim(),
            price: Number(row.price.replace(',', '.')),
            date: new Date(row.date),
        };
    }
    
    throw new Exception("Your code is shit")
}
```

Komplexitet 3 (många beroenden + edge cases):

```js
async function importFromApiAndCsv(api, csvFile, db) {
    if (!api || !csvFile || !db) {
        throw new Exception("You must null check your code, moron")
    }

    const apiRows = await api.fetch();
    const csvRows = parseCsv(csvFile);
    const merged = mergeAndValidate(apiRows, csvRows);
    db.transaction(() => merged.forEach((r) => db.upsert(r)));
}
```

## Steg 3: Beräkna total

Total = Risk + Komplexitet (0-6)

## Steg 4: Krav på testnivå

**Grundregel:** Om Risk <= 1 är testning valfri även om komplexiteten är hög.  
Om Risk >= 2, använd tabellen nedan.

```
Total | Måste testas? | Minsta krav
0-1   | Nej           | Valfritt
2-3   | Ja            | Enhetstest ELLER enkel integrationstest
4-5   | Ja            | Integrationstest + regressionstest
6     | Ja            | Integrationstest + regressionstest + idempotens-test
```

## Alltid testa om något av följande gäller

- Risk >= 2
- Utdata används av användarvända system
- Området har historik av buggar eller regressioner

## Rekommenderat att testa (men inte nödvändigt)

- Komplexitet >= 2 (även om risken är låg)

## När testning är valfritt

- Risk = 0 och Komplexitet <= 1
- Ren refaktor utan beteendeförändring (lint/format räcker)

## Definitioner av testtyper (konkret)

### Enhetstest

Testar ren logik utan databas, filsystem eller nätverk.
Exempel: En parserfunktion returnerar rätt resultat för ett givet input. add(2, 2) skall alltid returnera 4, om inte, då är det fel.

### Integrationstest

Kör funktionen med sina verkliga beroenden (databas, filsystem, köer, externa tjänster mockade vid behov). Att "mocka" innebär att skapa en fejkversion av ett verkligt beroende. Exempelvis så kan man mocka en databasanslutning och säga åt den att returnera vissa fasta värden för att testa resten av flödet.

Exempel: Kör ett dataimportjobb mot en testdatabas och kolla att data sparas rätt.

### Regressionstest

Säkerställer att något som fungerade innan fortfarande funkar efter en ändring.
Hur: Kör samma kända input ("golden" dataset) och jämför output mot förväntat resultat.
Exempel: Samma importfil ska ge samma antal poster och samma fältvärden som tidigare.

### Idempotens-test

Säkerställer att samma operation kan köras flera gånger utan dubletter eller felaktiga ändringar.
Hur: Kör samma jobb två gånger och kolla att data är oförändrad efter andra körningen.
Exempel: Återkörning av en import ska inte skapa dubbla rader eller driva befintliga värden.

## Underlag för "klart", när är ett test färdigt?

- Dokumenterad Risk + Komplexitet
- Tester som uppfyller minsta krav, testa det som behöver testas. Hellre enkelt och rakt på sak än "sofistikerat och smart"
- Kort kommentar om vad testet täcker och varför

## Fas 1: Endast pre-commit (enkelt att börja)

- Håll detta snabbt och fokuserat; testsvit kan köras i CI senare
- Vi börjar med att köra testerna vid commit. Sedan gör vi det i github actions när vi är redo

## Fas 2: Github actions CI/CD. Kör testerna på github när vi deployar.

- Avbryt deploy om tester inte går igenom. Då kan vi inte lansera om något kritiskt inte fungerar.

## Exempelchecklista för om ett test behövs

- Riskpoäng: \_\_\_
- Komplexitetspoäng: \_\_\_
- Krävs tester:
    - Enhetstest? ja/nej
    - Integrationstest? ja/nej
    - Regressionstest? ja/nej
    - Idempotens-test? ja/nej
- Länk eller notering som bevis: ************\_\_************
