import { DocType } from './types';

export const simpleExampleDocument: DocType = {
  id: '8282ef5d-9416-4694-bac6-3b3dda0bdd6c',
  version: 2,
  type: 'notebook',
  executingAllCells: false,
  cells: [
    {
      id: 'b7eab8b9-f50e-4de9-ba94-ecf1ad261685',
      cell_type: 'curl',
      execution_count: 0,
      cursor_position: {
        column: 1,
        lineNumber: 1,
        offset: 0,
      },
      metadata: {
        collapsed: false,
        jupyter: {
          source_hidden: false,
        },
      },
      outputs: [
        {
          protocol: 'HTTP/2 200 ',
          formattedBody: '',
          headers: {
            date: 'Mon, 04 Mar 2024 13:10:38 GMT',
            'content-type': 'application/json; charset=utf-8',
            'x-powered-by': 'Express',
            'access-control-allow-origin': '*',
            'content-encoding': 'br',
            'alt-svc': 'h3=":443"; ma=86400',
          },
          status: 200,
          bodyFilePath: '',
          bodyBase64: '',
          body: [
            '{"CurlerRoo":"A powerful text based REST API Client","1----------------------------------------------":"","What is CurlerRoo?":"CurlerRoo is a powerful text based REST API Client. It\'s carefully designed to work best for developers. Combining the power of cURL and the ease of use of a modern GUI, CurlerRoo is the perfect tool for both beginners and experts.","2----------------------------------------------":"","Powerful yet simple":"CurlerRoo supports custom variables and scripts before and after sending the request. This allows you to easily create complex requests and automate your workflow. The scripts are written in JavaScript, so you can use all the power of the language to manipulate the request and response data.","3----------------------------------------------":"","Intuitive by design, powerful in action":"Scripts are powerful, but you don\'t have to write them. You can create variables from responses and embed them in the next request with just a few clicks.","4----------------------------------------------":"","See more. Click less.":"Multiple requests could be displayed in a single window. Thanks to the compact of cURL commands. This allows you to easily execute multiple chained requests. For example, you can create a request that logs in, then use the response to create a request that fetches data, and then use that data to create a request that updates something. All in a single window.","5----------------------------------------------":"","Syntax Highlighting & Suggestions":"Struggle to remember exact cURL syntax? CurlerRoo\'s intelligent syntax highlighting and suggestion features make writing and understanding cURL commands a breeze. Our editor guides you, reducing errors and improving your workflow.","6----------------------------------------------":"","Organize and Run with Ease":"By making the GUI intuitive and compact. CurlerRoo feels organized and doesn\'t get lost even if you have so many requests."}',
          ],
          responseDate: 1709557838149,
        },
      ],
      sendHistories: [
        {
          id: 'f8f6c5f3-78a2-4fa2-9d68-6a12c9b8a1d1',
          sentAt: 1709557838149,
          request: {
            source: [
              'curl https://api.curlerroo.com/example \\',
              "  -X 'POST'",
            ],
            pre_scripts: [''],
            post_scripts: [''],
            pre_scripts_enabled: false,
            post_scripts_enabled: false,
          },
          outputs: [
            {
              protocol: 'HTTP/2 200 ',
              formattedBody: '',
              headers: {
                date: 'Mon, 04 Mar 2024 13:10:38 GMT',
                'content-type': 'application/json; charset=utf-8',
                'x-powered-by': 'Express',
                'access-control-allow-origin': '*',
                'content-encoding': 'br',
                'alt-svc': 'h3=":443"; ma=86400',
              },
              status: 200,
              bodyFilePath: '',
              bodyBase64: '',
              body: [
                '{"CurlerRoo":"A powerful text based REST API Client","1----------------------------------------------":"","What is CurlerRoo?":"CurlerRoo is a powerful text based REST API Client. It\'s carefully designed to work best for developers. Combining the power of cURL and the ease of use of a modern GUI, CurlerRoo is the perfect tool for both beginners and experts.","2----------------------------------------------":"","Powerful yet simple":"CurlerRoo supports custom variables and scripts before and after sending the request. This allows you to easily create complex requests and automate your workflow. The scripts are written in JavaScript, so you can use all the power of the language to manipulate the request and response data.","3----------------------------------------------":"","Intuitive by design, powerful in action":"Scripts are powerful, but you don\'t have to write them. You can create variables from responses and embed them in the next request with just a few clicks.","4----------------------------------------------":"","See more. Click less.":"Multiple requests could be displayed in a single window. Thanks to the compact of cURL commands. This allows you to easily execute multiple chained requests. For example, you can create a request that logs in, then use the response to create a request that fetches data, and then use that data to create a request that updates something. All in a single window.","5----------------------------------------------":"","Syntax Highlighting & Suggestions":"Struggle to remember exact cURL syntax? CurlerRoo\'s intelligent syntax highlighting and suggestion features make writing and understanding cURL commands a breeze. Our editor guides you, reducing errors and improving your workflow.","6----------------------------------------------":"","Organize and Run with Ease":"By making the GUI intuitive and compact. CurlerRoo feels organized and doesn\'t get lost even if you have so many requests."}',
              ],
              responseDate: 1709557838149,
            },
          ],
        },
      ],
      selectedSendHistoryId: 'f8f6c5f3-78a2-4fa2-9d68-6a12c9b8a1d1',
      source: ['curl https://api.curlerroo.com/example \\', "  -X 'POST'"],
      pre_scripts_enabled: false,
      pre_scripts: [''],
      post_scripts_enabled: false,
      post_scripts: [''],
      send_status: 'success',
    },
    {
      id: '134b9e7f-31d6-437f-a175-e1dbc47a25ae',
      cell_type: 'curl',
      execution_count: 0,
      cursor_position: {
        column: 1,
        lineNumber: 1,
        offset: 0,
      },
      metadata: {
        collapsed: false,
        jupyter: {
          source_hidden: false,
        },
      },
      outputs: [
        {
          protocol: '',
          formattedBody: '',
          headers: {},
          status: 0,
          bodyFilePath: '',
          bodyBase64: '',
          body: [''],
          responseDate: 0,
        },
      ],
      sendHistories: [],
      selectedSendHistoryId: undefined,
      source: [''],
      pre_scripts_enabled: false,
      pre_scripts: [''],
      post_scripts_enabled: false,
      post_scripts: [''],
      send_status: 'idle',
    },
  ],
  globalVariables: [],
};
