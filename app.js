const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { format, isValid, toDate } = require("date-fns");

const app = express();

let db = null;

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

initializeDbAndServer();

const queriesMiddleWare = async (request, response, next) => {
  const { status, priority, category, search_q, date } = request.query;
  const { todoId } = request.params;
  //   console.log(todoId);

  if (status !== undefined) {
    if (status === "DONE" || status === "TO DO" || status === "IN PROGRESS") {
      request.status = status;
      //   console.log("inside status", request);
    } else {
      response.status(400);
      response.send("Invalid todo status");
      return;
    }
  }

  if (priority !== undefined) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid todo priority");
      return;
    }
  }
  if (category !== undefined) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid todo category");
      return;
    }
  }
  if (date !== undefined) {
    try {
      const myDate = new Date(date);

      const formatedDate = format(new Date(date), "yyyy-MM-dd");
      console.log(formatedDate, "f");
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${myDate.getMonth() + 1}-${myDate.getDate()}`
        )
      );
      console.log(result, "r");
      console.log(new Date(), "new");

      const isValidDate = await isValid(result);
      console.log(isValidDate, "V");
      if (isValidDate === true) {
        request.date = formatedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (e) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }

  request.search_q = search_q;
  request.todoId = todoId;
  next();
};

const bodyRequestMiddleWare = async (request, response, next) => {
  const { id, status, priority, category, todo, dueDate } = request.body;
  const { todoId } = request.params;

  if (status !== undefined) {
    if (status === "DONE" || status === "TO DO" || status === "IN PROGRESS") {
      request.status = status;
      //   console.log("inside status", request);
    } else {
      response.status(400);
      response.send("Invalid todo status");
      return;
    }
  }

  if (priority !== undefined) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid todo priority");
      return;
    }
  }
  if (category !== undefined) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid todo category");
      return;
    }
  }
  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate);
      const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const result = toDate(new Date(formattedDate));
      const isValidDate = isValid(result);
      if (isValidDate === true) {
        request.dueDate = formattedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (e) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }

  request.todo = todo;
  request.id = id;

  request.todoId = todoId;
  next();
};

//API 1

app.get("/todos/", queriesMiddleWare, async (request, response) => {
  const {
    search_q = "",
    priority = "",
    status = "",
    category = "",
    dueDate = "",
  } = request;
  //   console.log("inside api call");

  //   console.log(request.status);

  const selectQuery = `SELECT
          id,
          todo,
          priority,
          status,
          category,
          due_date AS dueDate
          FROM todo
          WHERE
          todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%' AND
          status LIKE '%${status}%' AND
          category LIKE '%${category}%';`;

  const todos = await db.all(selectQuery);
  response.send(todos);
});

//API 2
app.get("/todos/:todoId/", queriesMiddleWare, async (request, response) => {
  const { todoId } = request;
  //   console.log(todoId);
  const selectTodoQuery = `
    SELECT id,
          todo,
          priority,
          status,
          category,
          due_date AS dueDate
    FROM todo
    WHERE id = ${todoId};`;

  const todo = await db.get(selectTodoQuery);
  response.send(todo);
});

//API 3
app.get("/agenda/", queriesMiddleWare, async (request, response) => {
  let { date } = request;
  //   console.log(date);

  //   date = format(new Date(`${date}`), "yyyy-MM-dd");

  const selectQuery = `SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo
    WHERE due_date = '${date}'
    `;
  //   console.log(selectQuery);

  const todos = await db.all(selectQuery);
  response.send(todos);
});

//API 4

app.post("/todos/", bodyRequestMiddleWare, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request;

  const insertQuery = `
  INSERT INTO
  todo(id, todo, priority, status, category, due_date)
  VALUES(${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');
  `;

  await db.run(insertQuery);
  response.send("Todo Successfully Added");
});

// API 5
const updateQueryFunction = async (colName, value, id) => {
  const updateQuery = `
  UPDATE todo
    SET ${colName} = '${value}'
    WHERE id = ${id};
  `;
  await db.run(updateQuery);
};

app.put("/todos/:todoId/", bodyRequestMiddleWare, async (request, response) => {
  const { todoId } = request;
  const { todo, priority, status, category, dueDate } = request;

  switch (true) {
    case status !== undefined:
      updateQueryFunction("status", status, todoId);
      response.send("Status Updated");
      break;
    case priority !== undefined:
      updateQueryFunction("priority", priority, todoId);
      response.send("Priority Updated");
      break;
    case category !== undefined:
      updateQueryFunction("category", category, todoId);
      response.send("Category Updated");
      break;
    case todo !== undefined:
      updateQueryFunction("todo", todo, todoId);
      response.send("Todo Updated");
      break;
    case dueDate !== undefined:
      updateQueryFunction("due_date", dueDate, todoId);
      response.send("Due Date Updated");
      break;
  }
});

//API 6
app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;

  const deleteQuery = `
    DELETE from todo
    WHERE id = ${todoId};
    `;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});
module.exports = app;
