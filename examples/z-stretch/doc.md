```ts
console.log(visibleColumnGroups.map((x, i) => [i, x.userData.columnIndex]));
```

`i` === `columnIndex` here, 0..n

so what happens when we want to insert vanilla columns?

we insert them with index -1

very side dependent

we deal with the indices after the fact
