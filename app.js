const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { format } = require("date-fns");

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

//API 4

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

// API 6

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;

  const deleteQuery = `
    DELETE from todo
    WHERE id = ${todoId};
    `;

  await db.run(deleteQuery);

  response.send("Todo Deleted");
});

//API 5

const updateQueryFunction = async (colName, value, id) => {
  const updateQuery = `UPDATE todo
    SET ${colName} = '${value}'
    WHERE id = ${id};
    `;
  await db.run(updateQuery);
};

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const {
    todo = "",
    priority = "",
    status = "",
    category = "",
    dueDate = "",
  } = request.body;

  //   console.log(status, priority, category);
  let switchValue = 0;

  if (todo !== "") {
    switchValue = 1;
  }
  if (status !== "") {
    switchValue = 2;
  }
  if (priority !== "") {
    switchValue = 3;
  }
  if (category !== "") {
    switchValue = 4;
  }
  if (dueDate !== "") {
    switchValue = 5;
  }

  switch (switchValue) {
    case 1:
      updateQueryFunction("todo", todo, todoId);
      break;
    case 2:
      //   console.log(updateQueryFunction("status", status, todoId, response));

      if (status === "DONE" || status === "TO DO" || status === "IN PROGRESS") {
        updateQueryFunction("status", status, todoId);
        response.send("Status Updated");
      } else {
        response.status(400);
        response.send(`Invalid todo status`);
      }
      break;
    case 3:
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        updateQueryFunction("priority", priority, todoId);
        response.send("Priority Updated");
      } else {
        response.status(400);
        response.send(`Invalid todo priority`);
      }
      break;
    case 4:
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        updateQueryFunction("category", category, todoId);
        response.send("Category Updated");
      } else {
        response.status(400);
        response.send(`Invalid todo category`);
      }
      break;
    case 5:
      let date = dueDate.split("-");
      date = format(new Date(date[0], date[1], date[2]), "yyyy-MM-dd");
      if (dueDate !== "") {
        updateQueryFunction("due_date", date, todoId);
        response.send("dueDate Updated");
      } else {
        response.status(400);
        response.send(`Invalid todo dueDate`);
      }

    default:
      break;
  }
});

//API 3

app.get("/agenda/", async (request, response) => {
  let { date } = request.query;
  //   console.log(date);

  date = format(new Date(`${date}`), "yyyy-MM-dd");

  const selectQuery = `SELECT * FROM todo 
    WHERE due_date = '${date}'
    `;
  //   console.log(selectQuery);

  const todos = await db.all(selectQuery);
  response.send(convertDbToJsObject(todos));
});

initializeDbAndServer();
module.exports = app;
