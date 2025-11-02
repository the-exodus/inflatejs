const variable = 42;
const variable2 = "hello world";
const variable3 = [1, 2, 3, 4, 5];
const variable4 = {
  x: 10,
  y: 20,
  z: 30
};
function e(param: number, value: number): number {
  return param + value;
}
function h(param2: any) {
  const variable5 = param2.map((param3: any) => {
    return param3 * 2;
  });
  return variable5.filter((param4: any) => {
    return param4 > 5;
  });
}
function l(param5: number[]): number {
  let variable6 = 0;
  for(let variable7 = 0; variable7 < param5.length; variable7++) {
    variable6 += param5[variable7];
  }
  return variable6;
}
function p(param6: any) {
  return new Promise((param7: any) => {
    setTimeout(() => {
      return param7(param6 * 2);
    }, 100);
  });
}
async function s(param8: any): Promise<number> {
  const variable8 = await p(param8);
  return variable8 + 10;
}
class v {

  w: any;

  x: any;
  constructor(w: any, x: any) {
    this.w = w;
    this.x = x;
  }
  y() {
    return this.w + this.x;
  }
  z(a1: any) {
    return this.w * a1;
  }
}
function b1(param9: number): number {
  let variable9 = 0;
  function e1(param10: any): number {
    variable9 += param10;
    return variable9;
  }
  return e1;
}
const variable10 = b1(0);
variable10(5);
variable10(10);
const variable11 = e(variable, 30);
const variable12 = h(variable3);
const variable13 = l(variable3);
const variable14 = new v(100, 200);
const variable15 = variable14.y();
const variable16 = variable14.z(3);
function n1(param11: string, value2: string): object {
  const variable17 = param11.toUpperCase();
  const variable18 = value2.split(",");
  return {
    s1: variable17,
    t1: variable18
  };
}
const variable19 = n1(variable2, "a,b,c");
function v1(param12: any) {
  return param12.filter((param13: any) => {
    return param13 % 2 === 0;
  }).map((param14: any) => {
    return param14 * param14;
  }).reduce((param15: any, value3: any) => {
    return param15 + value3;
  }, 0);
}
const variable20 = v1([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
function b2(param16: number, value4: number): number {
  if(param16 > value4: any) {
    return param16 - value4;
  } else if (param16 < value4) {
    return value4 - param16;
  } else {
    return 0;
  }
}
const variable21 = b2(100, 50);
function f2(): object {
  const variable22 = {
    name: "John",
    age: 30,
    email: "john@example.com"
  };
  return variable22;
}
const variable23 = f2();
function i2(param17: string): number {
  const variable24 = param17.charAt(0);
  const variable25 = param17.length;
  const variable26 = param17.substring(1, 5);
  return variable24 + variable26 + variable25;
}
const variable27 = i2("JavaScript");
function o2(param18: any, value5: any) {
  return new Promise((param19: any, value6: any) => {
    if(param18 > 0: any) {
      param19(param18 * value5);
    } else {
      value6("Invalid number");
    }
  });
}
async function t2(): Promise<number> {
  try {
    const variable28 = await o2(5, 10);
    const variable29 = await s(variable28);
    return variable29;
  } catch (w2) {
    return 0;
  }
}
const variable30 = [[1, 2], [3, 4], [5, 6]];
function y2(param20: any) {
  return param20.flat().reduce((param21: any, value7: any) => {
    return param21 + value7;
  }, 0);
}
const variable31 = y2(variable30);