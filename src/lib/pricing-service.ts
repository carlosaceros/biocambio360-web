import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { Product } from "./products";

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface ExtractedPrice {
    size: string; // '3.8L', '10L', '20L'
    averagePriceCOP: number;
}

/**
 * Helper to query Serper.dev Google API for a product query
 */
async function searchWebForPrices(query: string) {
    if (!SERPER_API_KEY) {
        throw new Error("SERPER_API_KEY is not configured");
    }

    const myHeaders = new Headers();
    myHeaders.append("X-API-KEY", SERPER_API_KEY);
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
        "q": query,
        "gl": "co", // Geolocation Colombia
        "hl": "es"  // Language Spanish
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow" as RequestRedirect
    };

    try {
        const response = await fetch("https://google.serper.dev/search", requestOptions);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error calling Serper.dev:", error);
        return null;
    }
}

/**
 * Uses Gemini to parse raw Google Search results and extract reasonable market averages.
 */
async function analyzePricesWithGemini(productName: string, searchResults: any): Promise<ExtractedPrice[]> {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // We want structured JSON output from Gemini
    const responseSchema: Schema = {
        type: SchemaType.ARRAY,
        items: {
            type: SchemaType.OBJECT,
            properties: {
                size: {
                    type: SchemaType.STRING,
                    description: "El tamaño del producto, debe ser exactamente '3.8L', '10L', o '20L'."
                },
                averagePriceCOP: {
                    type: SchemaType.INTEGER,
                    description: "El precio promedio razonable de mercado en COP para este tamaño (sin centavos). Filtra valores absurdamente bajos o altos."
                }
            },
            required: ["size", "averagePriceCOP"]
        }
    };

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.1, // Low temperature for factual extraction
        }
    });

    const prompt = `
Eres un analista experto en precios (pricing) de productos de aseo industrial en Colombia.
Tu tarea es leer los siguientes resultados crudos de búsqueda de Google y determinar el PRECIO PROMEDIO de mercado en Pesos Colombianos (COP) para un ${productName}.

Reglas RESTRITAS:
1. Necesito el precio promedio (aproximado) para 3 tamaños exactos de Garrafas: '3.8L' (Galón), '10L' (Pimpina pequeña), y '20L' (Pimpina grande).
2. Si un tamaño no se menciona explícitamente en los resultados de búsqueda, haz una estimación lógica basándote en el precio por litro del tamaño conocido.
   - Por ejemplo, si los 20L cuestan 80,000 COP, los 10L deberían rondar los 45,000 COP y los 3.8L unos 20,000 COP.
3. INCLUYE SIEMPRE LOS 3 TAMAÑOS: '3.8L', '10L', y '20L' en la respuesta JSON.
4. Ignora resultados de AliExpress u otras plataformas internacionales con precios absurdos o en dólares.
5. El valor debe ser un entero sólido (ej: 45000), sin puntos, comas ni el símbolo de dólar.

Resultados de búsqueda a analizar:
${JSON.stringify({
    shopping: searchResults.shopping?.slice(0, 10), // Limit to top 10 shopping results
    organic: searchResults.organic?.slice(0, 5) // Limit to top 5 organic results to avoid token limits
})}
`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText) as ExtractedPrice[];
    } catch (error) {
        console.error("Error analyzing prices with Gemini:", error);
        return [];
    }
}

/**
 * Automates finding the market price for a given product
 */
export async function getMarketPricesForProduct(product: Product): Promise<ExtractedPrice[]> {
    // 1. Construct a smart query
    // e.g "Detergente Ropa industrial 20 litros precio colombia"
    const query = `${product.nombre} industrial galon 20 litros precio colombia exito mercadolibre`;
    
    // 2. Search web
    const searchData = await searchWebForPrices(query);
    if (!searchData) return [];

    // 3. Extract logic
    const results = await analyzePricesWithGemini(product.nombre, searchData);
    
    return results;
}
