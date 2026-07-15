import type { Page, Request, Response, Route } from '@playwright/test';

type ResponseMatcher = (response: Response) => boolean;

export async function installRouteWithSettledCleanup(
  page: Page,
  url: string,
  handler: (route: Route, request: Request) => Promise<void>,
) {
  await page.route(url, handler);

  return (responsePromise: Promise<Response>) =>
    unrouteAfterResponse(page, url, responsePromise, handler);
}

export function waitForMatchingResponse(
  page: Page,
  urlPart: string,
  method?: string,
): Promise<Response> {
  const matches: ResponseMatcher = (response) =>
    response.url().includes(urlPart) && (!method || response.request().method() === method);

  return page.waitForResponse(matches);
}

async function unrouteAfterResponse(
  page: Page,
  url: string,
  responsePromise: Promise<Response>,
  handler: (route: Route, request: Request) => Promise<void>,
) {
  await responsePromise;
  await page.unroute(url, handler);
}
