const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

const dbPath = path.join(__dirname, "todoApplication.db");
app.use(express.json());

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (err) {
    console.log(`DB Error ${err.message}`);
    process.exit(1);
  }
};

const convertDbToJsObject = (object) => {
  return {
    id: object.id,
    todo: object.todo,
    priority: object.priority,
    status: object.status,
    category: object.category,
    dueDate: object.due_date,
  };
};

//GET ALL TODO's API 1
app.get("/todos/", async (request, response) => {
  const {
    search_q = "",
    priority = "",
    status = "",
    category = "",
    dueDate = "",
  } = request.query;

  let selectQuery = "";

  if (status !== "") {
    selectQuery = `
        SELECT * FROM todo
        WHERE 
        status = '${status}'
        ;`;
  } else if (priority !== "") {
    selectQuery = `
        SELECT * FROM todo
        WHERE 
        priority = '${priority}'
        ;`;
  } else if (category !== "") {
    selectQuery = `
  SELECT * FROM todo
  WHERE category = '${category}'
  ;`;
  } else if (category !== "" && status !== "") {
    selectQuery = `
  SELECT * FROM todo
  WHERE status = '${status}' 
  AND 
  category = '${category}';`;
  } else if (priority !== "" && status !== "") {
    selectQuery = `
  SELECT * FROM todo
  WHERE status = '${status}' 
  AND 
  priority = '${priority}';`;
  } else if (priority !== "" && category !== "") {
    selectQuery = `
  SELECT * FROM todo
  WHERE category = '${category}' 
  AND 
  priority = '${priority}';`;
  } else {
    selectQuery = `
  SELECT * FROM todo
  WHERE todo LIKE '%${search_q}%'
  ;`;
  }

  const todoS = await db.all(selectQuery);
  response.send(todoS.map(convertDbToJsObject));
});

//GET A TODO API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const selectTodoQuery = `
    SELECT * FROM todo
    WHERE id = ${todoId};`;

  const todo = await db.get(selectTodoQuery);
  response.send(convertDbToJsObject(todo));
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const insertQuery = `
  INSERT INTO 
  todo(id, todo, priority, status, category, due_date)
  VALUES(${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');
  `;

  await db.run(insertQuery);
  response.send("Todo Successfully Added");
});

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;

  const deleteQuery = `
    DELETE from todo
    WHERE id = ${todoId};
    `;

  await db.run(deleteQuery);

  response.send("Todo Deleted");
});

initializeDbAndServer();
module.exports = app;
