//Semantic analysis pass
//Set up scopes, etc for AST nodes and consolidate errors 

import { ArithmeticExpression, AssignmentStatement, ASTNode, FunctionDef, IfStatement, LiteralExpression, NegationExpression, ParseError, ReturnStatement, validIdentifier, VarDeclaration, VariableExpression, WhileStatement } from "./parser.js";

class Scope {
    #parent;
    #members = new Map(); //string -> (token, value)

    constructor(parent){
        this.#parent = parent;
    }

    getDeclaration(id){
        console.log("looking up", id);
        let map = this.#members;
        let scope = this;
        while(true){
            if(map.has(id)){
                console.log("found it");
                return map.get(id);
            }
            if(scope.#parent){
                scope = scope.#parent;
                map = scope.#members;
            } else {
                console.log("decl not found: ", id);
                return null;
            }
        }
    }

    addDecl(token){
        this.#members.set(token.value, {token: token});
    }

    toString(){
        let ret = "scope {\n";
        for (const [key, value] of this.#members) {
            ret += key + ": " + JSON.stringify(value) + "\n";
        }
        if(this.#parent){
            ret += this.#parent.toString();
        }
        ret += "}\n";
        return ret;
    }
}

//will be a postorder walk of the AST tree
export function analyze(func){
    let errors = [];
    //can't do any more analysis here
    if(func instanceof ParseError){
        return {"scope" : new Scope(), 'errors' : [func]};
    }

    let scope = analyzeArguments(func.parameters, errors);

    analyzeBody(func.body, scope, errors);
    
    //todo check to make sure there's a return statment IFF this returns int

    return {"scope": scope, "errors": errors};
}

function analyzeArguments(parameters, errors){
    let ret = new Scope();
    parameters.forEach(p => insertIntoScope(p, ret, errors));
    return ret;
}

function analyzeBody(statements, scope, errors){
    for(let statement of statements){
        console.log("analyzing " + statement.constructor.name);
        if(statement instanceof ParseError){
            errors.push(statement);
        } else if(statement instanceof IfStatement || statement instanceof WhileStatement){
            analyzeBlockedStatement(statement, scope, errors);
        } else if(statement instanceof VarDeclaration){
            insertIntoScope(statement.name, scope, errors);
            //todo: actually this needs to just be a literal expression, I think
            analyzeSimpleExpression(statement.value, scope, errors);
        } else if(statement instanceof AssignmentStatement){
            console.log("assign", JSON.stringify(statement.lhs));
            let lhs = scope.getDeclaration(statement.lhs.value);
            if(!lhs){
                errors.push(new ParseError(statement.startLine, statement.startCol, statement.endLine, statement.endCol,
                    "Assigning to unknown variable: " + statement.lhs.value));
            }
            analyzeExpression(statement.expr, scope, errors);
        } else if(statement instanceof ReturnStatement ){
            analyzeExpression(statement.expr, scope, errors);

        } else {
            console.log("unknown statement type");
        }
    }
}

function analyzeSimpleExpression(expr, scope, errors){
    console.log("analyzing simple ", JSON.stringify(expr));
    if (expr instanceof VariableExpression) {
        if(!scope.getDeclaration(expr.name)){
            errors.push(new ParseError(expr.startLine, expr.startCol, expr.endLine, expr.endCol,
                "Use of unknown variable name: " + expr.name));
        }
        return;
    } else if(! (expr instanceof LiteralExpression)){
        errors.push(new ParseError(expr.startLine, expr.startCol, expr.endLine, expr.endCol,
            "Expecting a simple expression but got " + expr.constructor.name));
    }
}

function analyzeExpression(expr, scope, errors){
    //console.log("analyzing expression: ", expr.constructor.name, JSON.stringify(expr));
    if( expr instanceof VariableExpression || expr instanceof LiteralExpression){
        analyzeSimpleExpression(expr, scope, errors);
    } else if(expr instanceof NegationExpression){
        analyzeExpression(expr.expr, scope, errors);
    } else if(expr instanceof ArithmeticExpression){
        if(!(expr.op.value == '+' || expr.op.value == '-')){
            errors.push(new ParseError(expr.startLine, expr.startCol, expr.endLine, expr.endCol,
                "Invalid operation: " + expr.op));
        }
        //LHS should be simple
        analyzeSimpleExpression(expr.lhs, scope, errors);
        analyzeExpression(expr.rhs, scope, errors);
    } else {
        console.log("UNKNOWN EXPRESSION TYPE!!", JSON.stringify(expr));
    }
}

function analyzeBlockedStatement(statement, scope, errors){
    console.log(JSON.stringify(statement));
    analyzeConditionalExpression(statement.cond, scope, errors);
    let bodyScope = new Scope(scope); //nested scope
    if(statement instanceof IfStatement){
        analyzeBody(statement.thenStatements, bodyScope, errors);
        console.log(JSON.stringify(statement.elseStatements));
        if(statement.elseStatements.length > 0){
            let elseScope = new Scope(scope);
            analyzeBody(statement.elseStatements, elseScope, errors);
        }
    } else {
        analyzeBody(statement.body, bodyScope, errors);
    }

}

function analyzeConditionalExpression(expr, scope, errors){
    analyzeExpression(expr.lhs, scope, errors);
    analyzeExpression(expr.rhs, scope, errors);
}
//adds token into scope if there's no entry for that identifier yet
//unlike real C, shadowing is not allowed
//adds an error if the scope already contains an entry for this ID
function insertIntoScope(token, scope, errors) {
    //each is a token
    if (!validIdentifier(token.value)) {
        errors.push(new ParseError(token.line, param.col, token.line, token.col + token.toString().length,
            "invalid identifier (variable name): " + token.value));
    } else {
        let prev = scope.getDeclaration(token.value);
        if (prev != null) {
            errors.push(new ParseError(token.line, token.col, token.line, token.col + token.toString().length,
                "duplicate identifier (name): " + token.value +
                " first used on line: " + prev.token.line.toString() + " column " + prev.token.col.toString()));
        } else {
            scope.addDecl(token);
        }
    }
}

