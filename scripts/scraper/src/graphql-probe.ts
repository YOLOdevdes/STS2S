/**
 * GraphQL endpoint probe for Mobalytics STS2 card data.
 *
 * Tests whether the GraphQL endpoint accepts unauthenticated POSTs using the
 * correct query structure discovered from network inspection of the Mobalytics
 * wiki cards page.
 *
 * The endpoint is: https://mobalytics.gg/api/sts2/v1/graphql/query
 * Query root: game: sts2 { staticData { groups { cards(...) { data { ... } } } } }
 * Note: sts2Cards does NOT work — the correct path is through the sts2 game root.
 *
 * Exits 0 if endpoint returns 200 with card-shaped data.
 * Exits 1 otherwise.
 */

const ENDPOINT = "https://mobalytics.gg/api/sts2/v1/graphql/query";

const PROBE_QUERY = `query Sts2CardsProbe {
  game: sts2 {
    staticData {
      groups {
        cards(filter: {page: {all: true}, status: ACTIVE}) {
          data {
            id
            name
          }
        }
      }
    }
  }
}`;

async function probe(): Promise<void> {
  console.log(`Probing GraphQL endpoint: ${ENDPOINT}`);
  console.log("---");

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query: PROBE_QUERY, variables: {} }),
    });

    const body = await response.text();
    console.log(`HTTP status: ${response.status}`);
    console.log(`Response (first 500 chars): ${body.slice(0, 500)}`);
    console.log("---");

    if (response.status === 200) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        console.log("Response is not valid JSON — likely a Cloudflare challenge page");
        console.log("GraphQL endpoint accessible: NO — use Playwright fallback");
        process.exit(1);
        return;
      }

      const data = (parsed as { data?: { game?: { staticData?: { groups?: { cards?: { data?: unknown[] } } } } } }).data;
      const cards = data?.game?.staticData?.groups?.cards?.data;

      if (cards && Array.isArray(cards) && cards.length > 0) {
        console.log(`GraphQL endpoint accessible: YES — use direct POST`);
        console.log(`Cards returned in probe: ${cards.length}`);
        console.log(`Query path: game: sts2 > staticData > groups > cards(filter: {page: {all: true}, status: ACTIVE})`);
        process.exit(0);
      } else {
        const errors = (parsed as { errors?: unknown[] }).errors;
        if (errors) {
          console.log(`GraphQL errors: ${JSON.stringify(errors).slice(0, 300)}`);
        }
        console.log("GraphQL endpoint accessible: NO — unexpected response shape");
        process.exit(1);
      }
    } else if (response.status === 401 || response.status === 403) {
      console.log("GraphQL requires auth or is blocked — use Playwright fallback");
      process.exit(1);
    } else {
      console.log(`Unexpected HTTP status ${response.status}`);
      console.log("GraphQL endpoint accessible: NO — use Playwright fallback");
      process.exit(1);
    }
  } catch (err) {
    console.error("Network error during probe:", err);
    console.log("GraphQL endpoint accessible: NO — network error");
    process.exit(1);
  }
}

probe();
