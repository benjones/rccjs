from z3 import *
# run with uv run --with z3-solver nopsolver.py

ss = Solver()
# msb is 1, other 7 need to be discovered
vals = [Bool(x) for x in "pqrstuv"]

#not the halt instruction
ss.add(Not(And(Not(vals[0]), vals[1], Not(vals[2]), Not(vals[3]), Not(vals[4]), Not(vals[5]), vals[6])))
# doesn't write to a register
ss.add(Or(vals[0], vals[1], vals[2]))
ss.add(Or(vals[0], vals[1], Not(vals[2])))

# not a jump
ss.add(Or(And(Not(vals[2]),Not(vals[3]),Not(vals[4]),Not(vals[5])),
          And(Or(vals[0], Not(vals[1])),
              Or(Not(vals[0]), vals[1]),
              Or(Not(vals[0]), Not(vals[1])))))
              

#don't set condition codes
ss.add(Or(vals[0], vals[1]))
ss.add(Or(Not(vals[0]), vals[1], vals[2], vals[3], vals[4], vals[5]))
ss.add(Or(Not(vals[0]), Not(vals[1]), vals[2], vals[3], vals[4], vals[5]))

def all_smt(s, initial_terms):
    def block_term(s, m, t):
        s.add(t != m.eval(t, model_completion=True))
    def fix_term(s, m, t):
        s.add(t == m.eval(t, model_completion=True))
    def all_smt_rec(terms):
        if sat == s.check():
           m = s.model()
           yield m
           for i in range(len(terms)):
               s.push()
               block_term(s, m, terms[i])
               for j in range(i):
                   fix_term(s, m, terms[j])
               yield from all_smt_rec(terms[i:])
               s.pop()   
    yield from all_smt_rec(list(initial_terms))


for answer in all_smt(ss, []):
    print("solution: ", answer)
    
#ss.check()
#print(ss.model())
