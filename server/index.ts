import fastifyWebsocket, { SocketStream } from '@fastify/websocket';
import fastify, { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import typescript from 'typescript';
import { RawData } from 'ws';

const server = fastify({ logger: true });

server.register(fastifyWebsocket);

server.get('/script.js', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  reply.header('Content-Type', 'text/javascript');
  reply.send(
    typescript.transpileModule((await readFile(resolve('core', 'script.ts'))).toString(), {
      compilerOptions: typescript.parseJsonConfigFileContent(
        typescript.readConfigFile(typescript.findConfigFile(resolve('core'), typescript.sys.fileExists)!, typescript.sys.readFile).config,
        typescript.sys,
        resolve('core'),
      ).options,
    }).outputText,
  );
});

enum ResourceType {
  HTML = 'HTML',
  STYLE = 'STYLE',
  SCRIPT = 'SCRIPT',
  IMG = 'IMG',
}

server.register((instance: FastifyInstance, opts: FastifyPluginOptions, done: (err?: Error | undefined) => void) => {
  instance.get('/ws', { websocket: true }, (connection: SocketStream) => {
    connection.socket.on('message', async (data: RawData, isBinary: boolean) => {
      console.log('message', data.toString());
      const message: string = data.toString();
      if (message.startsWith(`${ResourceType.HTML};`)) {
        const html: string = await readFile(resolve('static', message.slice(ResourceType.HTML.length + 1)), { encoding: 'utf8' });
        connection.socket.send(`${ResourceType.HTML};${html}`);
      } else if (message.startsWith(`${ResourceType.STYLE};`)) {
        const style: string = await readFile(resolve('static', message.slice(ResourceType.STYLE.length + 1)), { encoding: 'utf8' });
        connection.socket.send(`${ResourceType.STYLE};${style}`);
      } else if (message.startsWith(`${ResourceType.IMG};`)) {
        const image: string = await readFile(resolve('static', message.slice(ResourceType.IMG.length + 1)), { encoding: 'base64' });
        connection.socket.send(`${ResourceType.IMG};${image}`);
      }
    });
  });
  done();
});

server.listen({ port: 3000 });
