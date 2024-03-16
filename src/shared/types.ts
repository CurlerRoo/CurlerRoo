import { z } from 'zod';

export type Variable = {
  key: string;
  value?: unknown;
  source: 'manual' | 'response';
};

export type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

export type CurlCellType = {
  id: string;
  cell_type: 'curl';
  name?: string;
  cursor_position: {
    lineNumber: number;
    column: number;
    offset: number;
  };
  execution_count: number | null;
  metadata: {
    collapsed: boolean;
    jupyter: {
      source_hidden: boolean;
    };
  };
  outputs: {
    protocol: string;
    headers: { [key: string]: string };
    status: number;
    bodyFilePath: string;
    bodyBase64: string;
    body: string[];
    formattedBody: string; // this is useful for copying to clipboard
    searchResult?: {
      start: number;
      end: number;
      index: number;
    }[];
    searchResultSelectedIndex?: number;
    showSearch: boolean;
    responseDate: number;
  }[];

  source: string[];
  send_status: 'idle' | 'sending' | 'success' | 'error';
  sending_id?: string;

  pre_scripts_enabled: boolean;
  pre_scripts: string[];
  pre_scripts_error?: string;
  pre_scripts_status?: 'idle' | 'sending' | 'success' | 'error';

  post_scripts_enabled: boolean;
  post_scripts: string[];
  post_scripts_error?: string;
  post_scripts_status?: 'idle' | 'sending' | 'success' | 'error';
};

export const docSchema = z.object({
  version: z.number().default(1),
  type: z.literal('notebook'),
  executingAllCells: z.boolean().default(false),
  cells: z.array(
    z.object({
      id: z.string(),
      cell_type: z.enum(['curl']),
      name: z.string().optional(),
      cursor_position: z.object({
        lineNumber: z.number(),
        column: z.number(),
        offset: z.number(),
      }),
      execution_count: z.union([z.number(), z.null()]),
      metadata: z.object({
        collapsed: z.boolean(),
        jupyter: z.object({
          source_hidden: z.boolean(),
        }),
      }),
      outputs: z.array(
        z.object({
          protocol: z.string(),
          headers: z.record(z.string()),
          status: z.number(),
          bodyFilePath: z.string(),
          body: z.array(z.string()),
          bodyBase64: z.string(),
          formattedBody: z.string().default(''),
          searchResult: z
            .array(
              z.object({
                start: z.number(),
                end: z.number(),
                index: z.number(),
              }),
            )
            .optional(),
          searchResultSelectedIndex: z.number().optional(),
          showSearch: z.boolean().default(false),
          responseDate: z.number().default(0),
        }),
      ),
      source: z.array(z.string()),
      pre_scripts_enabled: z.boolean().default(false),
      pre_scripts: z.array(z.string()),
      post_scripts_enabled: z.boolean().default(false),
      post_scripts: z.array(z.string()),
      send_status: z.enum(['idle', 'sending', 'success', 'error']),
      sending_id: z.string().optional(),
    }),
  ),
  globalVariables: z.array(
    z.object({
      key: z.string(),
      value: z.any(),
      source: z.enum(['manual', 'response']),
    }),
  ),
});

export type DocType = z.infer<typeof docSchema>;

export const docOnDiskSchema = z.object({
  version: z.number().default(1),
  type: z.literal('notebook'),
  cells: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      cell_type: z.enum(['curl']),
      execution_count: z.union([z.number(), z.null()]),
      metadata: z.object({
        collapsed: z.boolean(),
        jupyter: z.object({
          source_hidden: z.boolean(),
        }),
      }),
      outputs: z.array(
        z.object({
          protocol: z.string(),
          headers: z.record(z.string()),
          status: z.number(),
          bodyFilePath: z.string().optional(),
          bodyBase64: z.string().optional(),
          body: z.array(z.string()),
          responseDate: z.number(),
        }),
      ),
      source: z.array(z.string()),
      pre_scripts_enabled: z.boolean().default(false),
      pre_scripts: z.array(z.string()).default(['']),
      post_scripts_enabled: z.boolean().default(false),
      post_scripts: z.array(z.string()),
      send_status: z.enum(['idle', 'success', 'error']),
      sending_id: z.string().optional(),
    }),
  ),
  globalVariables: z.array(
    z.object({
      key: z.string(),
      value: z.any(),
      source: z.enum(['manual', 'response']),
    }),
  ),
});

export type DocOnDiskType = z.infer<typeof docOnDiskSchema>;
