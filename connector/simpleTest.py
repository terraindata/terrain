import sys
sys.path.append("./Release/")
import tconnector
x = tconnector.tql_connect("127.0.0.1", 7000)

# r = x.query("""
# {
# db.filter(<x> {
#         (product.category == 3 || product.category == 6)
#         && product.date > 236164 
#         && product.visible == true;
#         }
#     );
#     }
#     """)

# r = x.query("""
# db.filter(= {date >= 2315345627});
#     """)

r = x.query("""
{

var x = 3 + 7;
var f0 = <product> product.id == 123762;
var f1 = <product> {product.id == 123762};
var f2 = <product> return product.id == 123762;
var f3 = <product> {return product.id == 123762};
db.filter(f).filter(= date >= 2315345627).let(
    'q', = (rt + mins(15))/(nj + 1)).flatten();

var y = {1, 2, 'asdf':'qwerty'};

y[1] = 'qwerty';
y.asdf = 1234;
 
x++;

 
}
    """)
for e in r : print(e)



