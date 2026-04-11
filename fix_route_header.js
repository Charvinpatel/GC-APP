const fs = require('fs');
let c = fs.readFileSync('src/screens/TripsScreen.js', 'utf8');

const OLD = `                     <View style={styles.routeHeader}>\r\n                        <Text style={styles.routeTitle}>ROUTE #{index + 1}</Text>\r\n                     </View>`;

const NEW = `                     <View style={styles.routeHeader}>\r\n                        <Text style={styles.routeTitle}>ROUTE #{index + 1}</Text>\r\n                        {form.routes.length > 1 && (\r\n                          <TouchableOpacity\r\n                            onPress={() => removeRoute(r.id)}\r\n                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.red + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full }}\r\n                          >\r\n                            <Ionicons name="trash-outline" size={13} color={colors.red} />\r\n                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.red }}>REMOVE</Text>\r\n                          </TouchableOpacity>\r\n                        )}\r\n                     </View>`;

if (!c.includes(OLD)) {
  console.log('NOT FOUND - trying without \\r');
  const OLD2 = OLD.replace(/\\r\\n/g, '\n');
  if (!c.includes(OLD2)) {
    console.log('STILL NOT FOUND');
    process.exit(1);
  }
  fs.writeFileSync('src/screens/TripsScreen.js', c.replace(OLD2, NEW.replace(/\\r\\n/g, '\n')), 'utf8');
} else {
  fs.writeFileSync('src/screens/TripsScreen.js', c.replace(OLD, NEW), 'utf8');
}
console.log('DONE');
