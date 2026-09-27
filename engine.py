"""Ограниченная учебная среда, исполняющая синтаксис настоящего Python."""
import ast
import sys
import json
import operator
from copy import deepcopy
from levels import LEVELS

METHODS = {'move_right', 'move_left', 'move_up', 'move_down', 'move', 'collect', 'attack', 'say', 'enemy_ahead', 'gem_here', 'at_exit', 'path_clear'}
ALLOWED = (ast.Module, ast.Expr, ast.Assign, ast.AugAssign, ast.Name, ast.Load, ast.Store, ast.Constant, ast.Call, ast.Attribute, ast.For, ast.While, ast.If, ast.FunctionDef, ast.arguments, ast.arg, ast.Return, ast.Pass, ast.Break, ast.Continue, ast.List, ast.Tuple, ast.Subscript, ast.Slice, ast.BinOp, ast.UnaryOp, ast.BoolOp, ast.Compare, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.UAdd, ast.USub, ast.Not, ast.And, ast.Or, ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.In, ast.NotIn, ast.keyword)
BUILTINS = {'range': range, 'len': len, 'int': int, 'str': str, 'abs': abs, 'min': min, 'max': max, 'bool': bool}

class GameError(Exception):
    pass

def initial(level):
    state = dict(x=0, y=0, gems=[], enemies=[], doors=[], collected=0, defeated=0, speech='', actions=0)
    for y, row in enumerate(level['grid']):
        for x, char in enumerate(row):
            if char == 'S': state.update(x=x, y=y)
            if char == '*': state['gems'].append([x, y])
            if char == 'M': state['enemies'].append([x, y])
            if char == 'D': state['doors'].append([x, y])
    return state

def validate(code):
    if len(code) > 12000: raise GameError('Программа слишком длинная. Попробуй сократить её с помощью циклов.')
    tree = ast.parse(code, filename='<ученик>')
    funcs = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED): raise GameError('Эта конструкция пока недоступна в учебной игре: ' + type(node).__name__)
        if isinstance(node, (ast.Name, ast.arg, ast.FunctionDef)):
            name = getattr(node, 'id', getattr(node, 'arg', getattr(node, 'name', '')))
            if name.startswith('_'): raise GameError('Используй имена переменных без начального подчёркивания.')
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (str, bytes)) and len(node.value) > 5000:
                raise GameError('Строка слишком длинная для учебного задания.')
            if type(node.value) is int and node.value.bit_length() > 128:
                raise GameError('Попробуй использовать меньшее число.')
        if isinstance(node, ast.Attribute):
            if not isinstance(node.value, ast.Name) or node.value.id != 'hero' or node.attr not in METHODS or not isinstance(node.ctx, ast.Load):
                raise GameError('Доступны только игровые методы hero из справочника.')
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id not in set(BUILTINS) | funcs | {'print'}:
                raise GameError('Неизвестная функция «' + node.func.id + '». Проверь имя или создай её через def.')
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store) and node.id == 'hero':
            raise GameError('Имя hero занято героем. Выбери другое имя переменной.')
    return tree

def concept_ok(tree, name):
    nodes = list(ast.walk(tree))
    has = lambda cls: any(isinstance(n, cls) for n in nodes)
    checks = {
        'assign': lambda: has(ast.Assign), 'math': lambda: has(ast.BinOp),
        'string': lambda: any(isinstance(n, ast.Constant) and isinstance(n.value, str) for n in nodes) and has(ast.Assign),
        'for': lambda: has(ast.For), 'nested': lambda: any(isinstance(n, ast.For) and any(isinstance(c, ast.For) for b in n.body for c in ast.walk(b)) for n in nodes),
        'if': lambda: has(ast.If), 'for_if': lambda: any(isinstance(n, ast.For) and any(isinstance(c, ast.If) for b in n.body for c in ast.walk(b)) for n in nodes),
        'else': lambda: any(isinstance(n, ast.If) and n.orelse for n in nodes), 'while': lambda: has(ast.While),
        'function': lambda: has(ast.FunctionDef), 'parameter': lambda: any(isinstance(n, ast.FunctionDef) and n.args.args for n in nodes),
        'return': lambda: has(ast.Return), 'list': lambda: has(ast.List) and has(ast.For),
        'review_for': lambda: has(ast.Assign) and has(ast.For),
        'review_while': lambda: has(ast.While) and has(ast.If),
        'review_function': lambda: has(ast.FunctionDef) and has(ast.For) and has(ast.List),
        'accumulate': lambda: has(ast.For) and any(isinstance(n, ast.AugAssign) and isinstance(n.op, ast.Add) for n in nodes),
        'and': lambda: has(ast.And) and has(ast.If),
        'or': lambda: has(ast.Or) and has(ast.If),
        'elif': lambda: any(isinstance(n, ast.If) and n.orelse and isinstance(n.orelse[0], ast.If) for n in nodes),
        'break': lambda: has(ast.Break) and has(ast.While),
        'continue': lambda: has(ast.Continue) and has(ast.While),
        'range_step': lambda: any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'range' and len(n.args) == 3 for n in nodes),
        'index': lambda: has(ast.Subscript) and has(ast.For),
        'index_while': lambda: has(ast.Subscript) and has(ast.While) and has(ast.Compare),
        'unpack': lambda: any(isinstance(n, ast.For) and isinstance(n.target, ast.Tuple) and len(n.target.elts) == 2 for n in nodes),
        'bool_return': lambda: any(isinstance(n, ast.Return) and isinstance(n.value, ast.BoolOp) for n in nodes) and has(ast.FunctionDef),
        'default': lambda: any(isinstance(n, ast.FunctionDef) and n.args.defaults for n in nodes),
        'list_edit': lambda: any(isinstance(n, ast.Subscript) and isinstance(n.ctx, ast.Store) for n in nodes),
        'nested_gather': lambda: concept_ok(tree, 'nested') and has(ast.If),
        'advanced_final': lambda: concept_ok(tree, 'nested') and concept_ok(tree, 'unpack') and has(ast.FunctionDef) and has(ast.While) and has(ast.If) and has(ast.List),
        'final': lambda: has(ast.FunctionDef) and has(ast.While) and has(ast.If),
    }
    return not name or bool(checks[name]())

class Hero:
    def __init__(self, level, state, events):
        self.level, self.state, self.events = level, state, events
    def record(self, message):
        self.state['actions'] += 1
        if self.state['actions'] > 240: raise GameError('Слишком много действий. Проверь условие остановки цикла.')
        frame = sys._getframe(1)
        while frame and frame.f_code.co_filename != '<ученик>': frame = frame.f_back
        variables = {}
        if frame:
            for key, value in frame.f_locals.items():
                if key != 'hero' and not key.startswith('_') and isinstance(value, (str, int, float, bool, list, tuple, type(None))):
                    variables[key] = repr(value)[:90]
        self.events.append(dict(state=deepcopy(self.state), message=message, line=frame.f_lineno if frame else None, variables=variables))
    def target(self, direction):
        directions = {'right': (1, 0), 'left': (-1, 0), 'up': (0, -1), 'down': (0, 1)}
        if direction not in directions: raise GameError('Направление должно быть "right", "left", "up" или "down".')
        dx, dy = directions[direction]
        return [self.state['x'] + dx, self.state['y'] + dy]
    def path_clear(self, direction='right'):
        p = self.target(direction)
        x, y = p
        return 0 <= y < len(self.level['grid']) and 0 <= x < len(self.level['grid'][y]) and self.level['grid'][y][x] != '#' and p not in self.state['enemies'] and p not in self.state['doors']
    def move(self, direction, steps=1):
        if type(steps) is not int or not 1 <= steps <= 100: raise GameError('Количество шагов — целое число от 1 до 100.')
        for _ in range(steps):
            p = self.target(direction)
            if p in self.state['enemies']: raise GameError('Впереди теневой страж! Сначала используй hero.attack().')
            if p in self.state['doors']: raise GameError('Ворота закрыты. Произнеси пароль рядом с ними: hero.say(...).')
            if not self.path_clear(direction): raise GameError('Здесь дерево или край тропы. Посмотри на карту и измени направление.')
            self.state['x'], self.state['y'] = p
            self.record('Шаг ' + {'right':'вправо', 'left':'влево', 'up':'вверх', 'down':'вниз'}[direction])
    def move_right(self, steps=1): self.move('right', steps)
    def move_left(self, steps=1): self.move('left', steps)
    def move_up(self, steps=1): self.move('up', steps)
    def move_down(self, steps=1): self.move('down', steps)
    def collect(self):
        p = [self.state['x'], self.state['y']]
        if p not in self.state['gems']: raise GameError('Под ногами нет кристалла. Сначала встань на него или проверь hero.gem_here().')
        self.state['gems'].remove(p)
        self.state['collected'] += 1
        self.record('Кристалл памяти найден!')
    def enemy_ahead(self, direction='right'): return self.target(direction) in self.state['enemies']
    def gem_here(self): return [self.state['x'], self.state['y']] in self.state['gems']
    def at_exit(self): return self.level['grid'][self.state['y']][self.state['x']] == 'E'
    def attack(self, direction='right'):
        p = self.target(direction)
        if p not in self.state['enemies']: raise GameError('В этой соседней клетке нет стража. Проверь hero.enemy_ahead().')
        self.state['enemies'].remove(p)
        self.state['defeated'] += 1
        self.record('Теневой страж рассеялся!')
    def say(self, message):
        if not isinstance(message, str): raise GameError('Для речи нужна строка в кавычках.')
        self.state['speech'] = message[:100]
        opened = False
        for x, y in self.state['doors'][:]:
            if abs(x-self.state['x']) + abs(y-self.state['y']) == 1 and message == self.level['password']:
                self.state['doors'].remove([x, y]); opened = True
        self.record('Ворота открыты!' if opened else 'Герой: ' + message[:100])

def run(level_id, code):
    level = LEVELS[level_id]
    state, events = initial(level), []
    hero = Hero(level, state, events)
    result = dict(ok=False, events=events, state=state, error=None, line=None, concept=True)
    ticks = 0
    def trace(frame, event, arg):
        nonlocal ticks
        if frame.f_code.co_filename == '<ученик>':
            ticks += 1
            if ticks > 10000: raise GameError('Цикл не заканчивается. Проверь условие while и добавь действие, которое приближает героя к цели.')
        return trace
    try:
        tree = validate(code)
        def bounded(op, left, right):
            if op == 'mul':
                for sequence, count in ((left, right), (right, left)):
                    if isinstance(sequence, (list, tuple, str)) and isinstance(count, int) and len(sequence) * max(count, 0) > 10000:
                        raise GameError('Список или строка слишком велики. Уменьши число повторений.')
                if isinstance(left, int) and isinstance(right, int) and left.bit_length() + right.bit_length() > 1024:
                    raise GameError('Число стало слишком большим. Проверь вычисление в цикле.')
            if op == 'add' and isinstance(left, (list, tuple, str)) and isinstance(right, type(left)) and len(left) + len(right) > 10000:
                raise GameError('Список или строка слишком велики.')
            return {'add': operator.add, 'mul': operator.mul}[op](left, right)
        class BoundOperations(ast.NodeTransformer):
            def visit_BinOp(self, node):
                self.generic_visit(node)
                if isinstance(node.op, (ast.Add, ast.Mult)):
                    return ast.copy_location(ast.Call(func=ast.Name(id='_bounded', ctx=ast.Load()), args=[ast.Constant('add' if isinstance(node.op, ast.Add) else 'mul'), node.left, node.right], keywords=[]), node)
                return node
            def visit_AugAssign(self, node):
                if isinstance(node.target, ast.Name) and isinstance(node.op, (ast.Add, ast.Mult)):
                    value = ast.BinOp(left=ast.Name(id=node.target.id, ctx=ast.Load()), op=node.op, right=node.value)
                    return ast.copy_location(ast.Assign(targets=[node.target], value=self.visit_BinOp(value)), node)
                return self.generic_visit(node)
        result['concept'] = concept_ok(tree, level['requirement'])
        executable = ast.fix_missing_locations(BoundOperations().visit(tree))
        env = {'__builtins__': dict(BUILTINS), 'hero': hero, '_bounded': bounded}
        def output(*values): hero.record('Вывод: ' + ' '.join(str(v)[:150] for v in values)[:300])
        env['__builtins__']['print'] = output
        sys.settrace(trace)
        try: exec(compile(executable, '<ученик>', 'exec'), env, env)
        finally: sys.settrace(None)
        result['ok'] = hero.at_exit() and not state['gems'] and not state['enemies'] and result['concept']
        if not result['ok']:
            if not result['concept']: result['error'] = 'Используй тему этого урока: «' + level['topic'] + '». Цель — освоить новый приём.'
            elif state['gems']: result['error'] = 'Остались кристаллы: ' + str(len(state['gems'])) + '. Собери их все.'
            elif state['enemies']: result['error'] = 'На тропе остались стражи. Победи их и дойди до портала.'
            else: result['error'] = 'Программа закончилась, а герой ещё не в портале. Добавь команды движения.'
    except Exception as exc:
        sys.settrace(None)
        if isinstance(exc, SyntaxError):
            result['line'] = exc.lineno
            result['error'] = ('Проверь отступы: внутри блока нужны четыре пробела.' if isinstance(exc, IndentationError) else 'Проверь синтаксис: скобки, кавычки и двоеточие после if, for, while или def.')
        else:
            tb = exc.__traceback__
            while tb:
                if tb.tb_frame.f_code.co_filename == '<ученик>': result['line'] = tb.tb_lineno
                tb = tb.tb_next
            if isinstance(exc, GameError): result['error'] = str(exc)
            elif isinstance(exc, NameError): result['error'] = 'Python не знает это имя. Проверь написание и создай переменную до использования. ' + str(exc)
            elif isinstance(exc, TypeError): result['error'] = 'Не подходит тип значения или число аргументов. Проверь команду по справочнику. ' + str(exc)
            elif isinstance(exc, IndexError): result['error'] = 'Индекс за пределами списка. Первый индекс — 0, последний — len(список) - 1. Проверь условие цикла и значение индекса.'
            elif isinstance(exc, ZeroDivisionError): result['error'] = 'На ноль делить нельзя. Проверь делитель.'
            elif isinstance(exc, RecursionError): result['error'] = 'Функция вызывает себя слишком много раз. Проверь условие остановки.'
            else: result['error'] = 'Ошибка Python: ' + str(exc)[:220]
    return result

if __name__ == '__main__':
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
    if sys.platform != 'darwin':
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    request = json.load(sys.stdin)
    print(json.dumps(run(request['level'], request['code']), ensure_ascii=False))
