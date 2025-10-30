'use client';

import React from 'react';

type JsonLdData = Record<string, unknown> | Record<string, unknown>[];

export interface JsonLdProps {
  data: JsonLdData | null | undefined;
  id?: string;
}

function serialize(data: JsonLdData) {
  const json = JSON.stringify(data, null, 2);
  return json
    ?.replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function hasValues(data: JsonLdData) {
  if (Array.isArray(data)) {
    return data.length > 0;
  }

  return Object.keys(data).length > 0;
}

export function JsonLd({ data, id }: JsonLdProps) {
  if (!data) {
    return null;
  }

  if (!hasValues(data)) {
    return null;
  }

  const json = serialize(data);

  if (!json) {
    return null;
  }

  return <script type="application/ld+json" id={id} dangerouslySetInnerHTML={{ __html: json }} />;
}
