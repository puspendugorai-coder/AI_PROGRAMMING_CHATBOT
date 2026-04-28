import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.3-70b-versatile"

SUPPORTED_LANGUAGES = [
    "Python", "Java", "JavaScript", "C", "C++", "C#",
    "PHP", "Ruby", "Swift", "Kotlin", "Go", "Rust",
    "TypeScript", "R", "MATLAB", "SQL"
]

LANGUAGE_DATA = {
    "Python": {
        "libraries": ["NumPy", "Pandas", "Matplotlib", "Requests", "Flask", "Django", "FastAPI", "SQLAlchemy", "Scikit-learn", "TensorFlow", "PyTorch", "Pillow", "OpenCV", "Pygame", "Pytest"],
        "modules": ["os", "sys", "math", "random", "datetime", "json", "re", "collections", "itertools", "functools", "pathlib", "threading", "multiprocessing", "subprocess", "logging"],
        "keywords": ["def", "class", "import", "from", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "lambda", "yield", "async", "await", "pass", "break", "continue", "global", "nonlocal"],
        "functions": ["print()", "len()", "range()", "type()", "isinstance()", "enumerate()", "zip()", "map()", "filter()", "sorted()", "reversed()", "open()", "input()", "int()", "str()", "list()", "dict()", "set()", "tuple()", "max()", "min()", "sum()", "abs()"],
        "oop": ["Classes & Objects", "Inheritance", "Polymorphism", "Encapsulation", "Abstraction", "Magic/Dunder Methods", "Class Methods & Static Methods", "Properties & Decorators", "Multiple Inheritance", "MRO (Method Resolution Order)"],
        "tutorials": ["Getting Started with Python", "Data Types & Variables", "Control Flow", "Functions & Scope", "File Handling", "Exception Handling", "List Comprehensions", "Generators & Iterators", "Decorators", "Context Managers"]
    },
    "Java": {
        "libraries": ["Spring", "Hibernate", "JUnit", "Log4j", "Jackson", "Gson", "Apache Commons", "Guava", "Lombok", "Maven", "Gradle", "JDBC", "JavaFX", "Swing", "Netty"],
        "modules": ["java.lang", "java.util", "java.io", "java.nio", "java.net", "java.sql", "java.math", "java.time", "java.text", "java.security"],
        "keywords": ["public", "private", "protected", "static", "final", "abstract", "interface", "extends", "implements", "new", "this", "super", "return", "void", "class", "import", "package", "throws", "throw", "try", "catch", "finally", "synchronized", "volatile"],
        "functions": ["System.out.println()", "String.format()", "Arrays.sort()", "Collections.sort()", "Math.max()", "Integer.parseInt()", "String.valueOf()", "Object.toString()", "equals()", "hashCode()", "compareTo()", "length()", "charAt()", "substring()"],
        "oop": ["Classes & Objects", "Inheritance", "Polymorphism", "Encapsulation", "Abstraction", "Interfaces", "Abstract Classes", "Constructors", "Method Overloading", "Method Overriding", "Generics", "Inner Classes"],
        "tutorials": ["Java Basics", "Object-Oriented Programming", "Collections Framework", "Exception Handling", "Multithreading", "File I/O", "Streams API", "Lambda Expressions", "Annotations", "Design Patterns"]
    },
    "JavaScript": {
        "libraries": ["React", "Vue.js", "Angular", "Node.js", "Express", "jQuery", "Lodash", "Axios", "Moment.js", "D3.js", "Three.js", "Socket.io", "Jest", "Webpack", "Babel"],
        "modules": ["fs", "path", "http", "https", "os", "events", "stream", "crypto", "url", "querystring", "child_process", "cluster", "readline", "zlib"],
        "keywords": ["var", "let", "const", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "new", "this", "class", "extends", "import", "export", "async", "await", "typeof", "instanceof", "null", "undefined"],
        "functions": ["console.log()", "document.getElementById()", "addEventListener()", "setTimeout()", "setInterval()", "fetch()", "JSON.parse()", "JSON.stringify()", "Array.map()", "Array.filter()", "Array.reduce()", "Object.keys()", "Promise.all()", "Math.random()"],
        "oop": ["Prototype-based OOP", "ES6 Classes", "Constructor Functions", "Inheritance", "Closures", "Modules Pattern", "Factory Functions", "Mixins", "Symbols", "Proxies"],
        "tutorials": ["JavaScript Fundamentals", "DOM Manipulation", "ES6+ Features", "Asynchronous JS", "Promises & Async/Await", "Functional Programming", "Event Loop", "Closures & Scope", "Modules", "Web APIs"]
    },
    "C++": {
        "libraries": ["STL", "Boost", "Qt", "OpenCV", "Eigen", "SFML", "SDL", "Poco", "Google Test", "Catch2", "nlohmann/json", "spdlog"],
        "modules": ["iostream", "string", "vector", "map", "set", "algorithm", "memory", "thread", "mutex", "chrono", "fstream", "sstream", "cmath", "cstring"],
        "keywords": ["int", "float", "double", "char", "bool", "void", "class", "struct", "public", "private", "protected", "virtual", "override", "const", "static", "namespace", "template", "typename", "auto", "nullptr", "new", "delete", "this", "return"],
        "functions": ["cout <<", "cin >>", "printf()", "scanf()", "malloc()", "free()", "strlen()", "strcmp()", "sort()", "find()", "push_back()", "pop_back()", "make_shared()", "std::move()"],
        "oop": ["Classes & Objects", "Inheritance", "Polymorphism", "Encapsulation", "Abstract Classes", "Virtual Functions", "Operator Overloading", "Templates", "RAII", "Smart Pointers", "Move Semantics"],
        "tutorials": ["C++ Basics", "Pointers & References", "Memory Management", "STL Containers", "Templates & Generics", "Multithreading", "File I/O", "Exception Handling", "Modern C++17/20", "Design Patterns"]
    },
    "C": {
        "libraries": ["stdio.h", "stdlib.h", "string.h", "math.h", "glibc", "OpenSSL", "libcurl", "SQLite", "pthreads"],
        "modules": ["stdio.h", "stdlib.h", "string.h", "math.h", "time.h", "ctype.h", "limits.h", "stdint.h", "stdbool.h", "assert.h"],
        "keywords": ["int", "char", "float", "double", "void", "struct", "enum", "union", "typedef", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return", "goto", "static", "extern", "const", "volatile", "sizeof"],
        "functions": ["printf()", "scanf()", "malloc()", "calloc()", "realloc()", "free()", "fopen()", "fclose()", "fread()", "fwrite()", "strcpy()", "strlen()", "strcmp()", "memcpy()", "memset()"],
        "oop": ["Structs as Objects", "Function Pointers", "Encapsulation via Modules", "Opaque Pointers", "Polymorphism via Unions", "Callback Patterns"],
        "tutorials": ["C Basics", "Pointers", "Arrays & Strings", "Structures", "Dynamic Memory", "File I/O", "Preprocessor", "Linked Lists", "Data Structures", "Algorithms in C"]
    },
    "C#": {
        "libraries": [".NET", "ASP.NET", "Entity Framework", "LINQ", "WPF", "Blazor", "Unity", "NUnit", "xUnit", "Newtonsoft.Json", "AutoMapper", "Serilog"],
        "modules": ["System", "System.Collections", "System.IO", "System.Net", "System.Threading", "System.Linq", "System.Text", "System.Reflection", "System.Diagnostics"],
        "keywords": ["class", "public", "private", "protected", "static", "void", "int", "string", "bool", "var", "new", "return", "if", "else", "for", "foreach", "while", "switch", "case", "try", "catch", "finally", "async", "await", "using", "namespace", "interface", "abstract", "override", "virtual"],
        "functions": ["Console.WriteLine()", "Convert.ToInt32()", "String.Format()", "Math.Max()", "Array.Sort()", "List.Add()", "LINQ methods", "Task.Run()", "File.ReadAllText()", "DateTime.Now"],
        "oop": ["Classes & Objects", "Inheritance", "Polymorphism", "Interfaces", "Abstract Classes", "Properties", "Delegates & Events", "Generics", "Extension Methods", "Partial Classes"],
        "tutorials": ["C# Basics", "OOP in C#", "LINQ", "Async/Await", "Collections", "File I/O", "Exception Handling", "Delegates & Events", "Design Patterns", "Entity Framework"]
    }
}

# Add basic data for remaining languages
for lang in ["PHP", "Ruby", "Swift", "Kotlin", "Go", "Rust", "TypeScript", "R", "MATLAB", "SQL"]:
    if lang not in LANGUAGE_DATA:
        LANGUAGE_DATA[lang] = {
            "libraries": [f"Popular {lang} libraries coming soon"],
            "modules": [f"Core {lang} modules"],
            "keywords": [f"{lang} keywords"],
            "functions": [f"Built-in {lang} functions"],
            "oop": [f"OOP concepts in {lang}"],
            "tutorials": [f"Getting Started with {lang}", f"{lang} Best Practices"]
        }

SYSTEM_PROMPT = """You are an expert programming assistant specialized in helping developers with all programming languages. 

Your role is to:
1. Answer programming questions clearly and with working code examples
2. Explain concepts step-by-step with proper formatting
3. Provide best practices and common pitfalls
4. Use markdown formatting with proper code blocks using syntax highlighting

STRICT RULE: You ONLY answer questions related to programming and software development. If a question is NOT related to programming, coding, software, algorithms, data structures, computer science, or technology — respond with:
"❌ This question is not related to programming. Please ask a programming-related question."

Always format code with proper markdown code blocks with the language specified:
```python
# code here
```

Be thorough, educational, and practical in your answers."""