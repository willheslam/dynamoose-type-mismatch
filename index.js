const dynamoose = require("dynamoose")
const fkill = require("fkill")
const dynamodbLocal = require("dynamodb-local")

const dynamoPort = 4000
const getLocalDynamoose = () => {
  dynamoose.aws.ddb.local(`http://localhost:${dynamoPort}`)
  return dynamoose.aws.ddb()
}

const stopDynamo = async (child) => {
  child && dynamodbLocal.stop(dynamoPort)
  child && dynamodbLocal.stopChild(child)
  await fkill(`:${dynamoPort}`).catch((e) => false)
}

const createTable = async () => {
  const ddb = getLocalDynamoose()

  const child = await dynamodbLocal.launch(dynamoPort, null, [], true, true)
  await ddb
    .createTable({
      ...(await MyModel.table.create.request())
    })
    .promise()

  return child
}

const modelOptions = {
  create: false,
  update: false,
  waitForActive: false,
}

const schema = new dynamoose.Schema(
  {
    hashKey: {
      type: String,
      hashKey: true,
      required: true,
    },
  },
  { saveUnknown: true }
)

const MyModel = dynamoose.model("mytable", schema, modelOptions)

const program = async () => {
  const child = await createTable()
  try {
    await MyModel.batchPut([
      {
        hashKey: "foo",
        bar: null, // comment this out and the type mismatch goes away
      },
    ])
    const records = await MyModel.query({ hashKey: { eq: "foo" } }).exec()

    console.log("records", records)
  } finally {
    await stopDynamo(child)
  }
}

program()
