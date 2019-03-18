import bodyParser from 'body-parser'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import useragent from 'express-useragent'
import { imageHealthCheckQueue } from 'jobs/image-processor'
import methodOverride from 'method-override'
import arenaMiddleware from 'middlewares/arena'
import routes from 'routes'
import { serverStartingHealthCheck } from 'utils'
import logger from 'utils/logger'

const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride())
app.use(useragent.express())

app.use('/', arenaMiddleware)

app.all('*', routes)

app.all('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: '404 Not found',
  })
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(error.stack)
  res.status(500).json({
    code: 500,
    message: error.message,
  })
})

serverStartingHealthCheck()
  .then(() => {
    imageHealthCheckQueue.add('clean-uploads-dir', null, {
      repeat: { every: 500 },
    })
    app.listen(process.env.PORT, () =>
      logger.info('Server has started with %o', {
        port: process.env.PORT,
        env: process.env.NODE_ENV,
      }),
    )
  })
  .catch(e => {
    logger.error('Server health check failed')

    process.exit(0)
  })
